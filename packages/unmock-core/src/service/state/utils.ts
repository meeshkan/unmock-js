import debug from "debug";
import {
  DEFAULT_STATE_ENDPOINT,
  DEFAULT_STATE_HTTP_METHOD,
} from "../constants";
import {
  codeToMedia,
  ExtendedHTTPMethod,
  HTTPMethod,
  isReference,
  isRESTMethod,
  mediaTypeToSchema,
  OASMethodKey,
  Operation,
  PathItem,
  Paths,
  Responses,
  Schema,
} from "../interfaces";
import { IStateUpdate, OperationsForStateUpdate } from "./interfaces";

type codeKey = keyof Responses;
interface ICodesToMediaTypes {
  [code: string]: string[];
}

const debugLog = debug("unmock:state:utils");

/**
 * Given a list of possibly relevent `states` (each being a mapping from
 * a status code, to a mediatype, to the state itself), and an `operation`,
 * filter and return only those states that are relevant for the request Operation.
 * If multiple states apply, spread them into a single state - `states` is expected
 * to be sorted so that the first element is the "widest" match, and the last element
 * is the most specific match.
 */
export const filterStatesByOperation = (
  states: codeToMedia[],
  operation: Operation,
): codeToMedia => {
  const opResponses = operation.responses;
  const statusCodes = Object.keys(opResponses);
  // Types of 'MediaType' keys that are present in given Operation
  const mediaTypes: ICodesToMediaTypes = Object.keys(opResponses).reduce(
    (types: ICodesToMediaTypes, code: string) => {
      const response = opResponses[code as codeKey];
      return Object.assign(
        types,
        response === undefined ||
        isReference(response) || // Checked for typing purposes, there are no $refs in states.
          response.content === undefined
          ? { [code]: [] }
          : { [code]: Object.keys(response.content) },
      );
    },
    {},
  );
  // Filter each state by status code and media type present in Operation
  const filtered = states.reduce(
    (stateAcc: codeToMedia[], state: codeToMedia) => {
      const relCodesInState = Object.keys(state).filter((code: string) =>
        statusCodes.includes(code),
      );
      if (relCodesInState.length === 0) {
        // None match - we can safely ignore this state
        return stateAcc;
      }
      stateAcc.push(filterByMediaType(relCodesInState, state, mediaTypes));
      return stateAcc;
    },
    [],
  );
  // Spread out for each status code and each media type
  return spreadNestedCodeToMedia(filtered);
};

const spreadNestedCodeToMedia = (nested: codeToMedia[]) => {
  const spreaded: codeToMedia = {};
  for (const state of nested) {
    for (const code of Object.keys(state)) {
      const resp: Record<string, Schema> = state[code as codeKey] as any;
      for (const mediaType of Object.keys(state[code])) {
        const content = resp[mediaType];
        if (content !== undefined) {
          const spreadSchema = {
            ...(spreaded[code] || {})[mediaType],
            ...content,
          };
          spreaded[code] = {
            ...spreaded[code],
            ...{ [mediaType]: spreadSchema },
          };
        }
      }
    }
  }
  return spreaded;
};

const filterByMediaType = (
  statusCodes: string[],
  stateObj: codeToMedia,
  allowedMediaTypes: ICodesToMediaTypes,
) => {
  const stateCodeToMedia: codeToMedia = {};
  for (const code of statusCodes) {
    const codeSchema = stateObj[code];
    const validMediaTypes = Object.keys(codeSchema).filter(
      (mediaType: string) => allowedMediaTypes[code].includes(mediaType),
    );
    if (validMediaTypes.length === 0) {
      continue;
    }
    // some are valid, add them to the list
    stateCodeToMedia[code] = validMediaTypes.reduce(
      (filteredCodeToMedia: mediaTypeToSchema, mediaType: string) =>
        Object.assign(filteredCodeToMedia, {
          [mediaType]: codeSchema[mediaType],
        }),
      {},
    );
  }
  return stateCodeToMedia;
};

/**
 * Gets relevant operations for given method and endpoint, filtering out
 * any endpoints/method combinations that do not match.
 * @returns An object with operations and possibly an error message. If
 *          error is defined, operations is guaranteed to be an empty array.
 *          An error is always an indication that something couldn't be found
 *          with the given (method, endpoint) combination in this service.
 */
export const getOperations = ({
  stateInput,
  schemaEndpoint,
  serviceName,
  paths,
}: IStateUpdate): { operations: OperationsForStateUpdate; error?: string } => {
  const { method, endpoint } = stateInput;
  const isDefMethod = method === DEFAULT_STATE_HTTP_METHOD;
  // Short handle for returning a failed result
  const errPref = "Can't find ";
  const errSuff = ` in '${serviceName}'!`;
  const err = (msg: string) => ({
    operations: [],
    error: errPref + msg + errSuff,
  });

  if (endpoint !== DEFAULT_STATE_ENDPOINT) {
    debugLog(`Fetching operations for specific endpoint '${endpoint}'...`);
    const pathItem = paths[schemaEndpoint];
    if (pathItem === undefined) {
      return err(`endpoint '${endpoint}'`);
    }

    if (isDefMethod) {
      // Specific endpoint, all methods
      debugLog(`Fetching operations for any REST method...`);
      const ops = getOperationsFromPathItem(pathItem, endpoint);
      return ops === undefined
        ? err(`any operations under '${endpoint}'`)
        : { operations: ops };
    }

    // Specific endpoint, specific method
    debugLog(`Fetching operations for REST method '${method}'...`);
    const op = pathItem[method as HTTPMethod];
    return op === undefined
      ? err(`response for '${method} ${endpoint}'`)
      : {
          operations: [
            {
              endpoint,
              method: method as HTTPMethod,
              operation: op,
            },
          ],
        };
  }
  // any endpoint
  debugLog(`Fetching operations for any endpoint...`);
  const operations = getOperationsByMethod(method, paths);
  return operations === undefined
    ? err(
        `any endpoints with ` +
          `${isDefMethod ? "operations" : `method '${method}'`}`,
      )
    : { operations };
};

const getOperationsByMethod = (
  method: ExtendedHTTPMethod,
  paths: Paths,
): OperationsForStateUpdate | undefined => {
  const anyMethod = method === DEFAULT_STATE_HTTP_METHOD;
  const filterFn = anyMethod
    ? (pathItemKey: string) => isRESTMethod(pathItemKey)
    : (pathItemKey: string) => pathItemKey === method;

  const operations: OperationsForStateUpdate = Object.keys(paths).reduce(
    (ops: OperationsForStateUpdate, path: string) => {
      // For each path, we reduce the relevant methods (= operations)
      const pathItem = paths[path];
      const pathOperations: OperationsForStateUpdate = Object.keys(pathItem)
        .filter((maybeOperationKey: string) => filterFn(maybeOperationKey))
        .map((operationKey: string) => ({
          endpoint: path,
          method: operationKey as HTTPMethod,
          operation: pathItem[operationKey as OASMethodKey] as Operation,
        }));
      return ops.concat(pathOperations);
    },
    [],
  );
  if (operations.length === 0) {
    return undefined;
  }
  return operations;
};

const getOperationsFromPathItem = (
  pathItem: PathItem,
  endpoint: string,
): OperationsForStateUpdate | undefined => {
  const operations: OperationsForStateUpdate = [];
  for (const key of Object.keys(pathItem)) {
    if (isRESTMethod(key)) {
      const method = key as HTTPMethod;
      const operation = pathItem[key];
      if (operation !== undefined) {
        operations.push({ endpoint, method, operation });
      }
    }
  }
  if (operations.length === 0) {
    return undefined;
  }
  return operations;
};
