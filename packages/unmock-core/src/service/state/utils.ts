import debug from "debug";
import {
  DEFAULT_STATE_ENDPOINT,
  DEFAULT_STATE_HTTP_METHOD,
} from "../constants";
import { DSLKeys } from "../dsl/interfaces";
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
import {
  IStateUpdate,
  IValidationError,
  OperationsForStateUpdate,
} from "./interfaces";

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
  debugLog(
    `filterStatesByOperation: Filtering which states from ${JSON.stringify(
      states,
    )} are valid for ${JSON.stringify(operation)}`,
  );
  const opResponses = operation.responses;
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
  debugLog(
    `filterStatesByOperation: acceptable media types from operation: ${JSON.stringify(
      mediaTypes,
    )}`,
  );
  // Filter each state by status code and media type present in Operation
  const filtered = states.map((state: codeToMedia) =>
    filterByMediaType(state, mediaTypes),
  );
  debugLog(
    `filterStatesByOperation: Matching state after filtering status codes and media types: ${JSON.stringify(
      filtered,
      (_: string, value: any) =>
        typeof value === "function" ? `Function()` : value,
    )}`,
  );
  // Spread out for each status code and each media type
  return flattenCodeToMediaBySpreading(filtered);
};

const flattenCodeToMediaBySpreading = (nested: codeToMedia[]) => {
  debugLog(`flattenCodeToMediaBySpreading: Flattening ${nested}...`);
  const spreaded: codeToMedia = {};
  for (const state of nested) {
    for (const code of Object.keys(state)) {
      const resp: Record<string, Schema> = state[code as codeKey] as any;
      for (const mediaType of Object.keys(resp)) {
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

/**
 * Attempts to match all media types from `allowedMediaTypes` with the `stateObj`.
 * @param stateObj
 * @param allowedMediaTypes
 */
const filterByMediaType = (
  stateObj: codeToMedia,
  allowedMediaTypes: ICodesToMediaTypes,
) => {
  debugLog(
    `filterByMediaType: Attempting to match media types from ${JSON.stringify(
      allowedMediaTypes,
    )} with ${JSON.stringify(stateObj)}`,
  );
  const stateCodeToMedia: codeToMedia = {};
  for (const code of Object.keys(stateObj)) {
    debugLog(`filterByMediaType: Filtering for status code ${code}`);
    const codeSchema = stateObj[code];
    const matchMediaTypes = (key: string) =>
      allowedMediaTypes[key] === undefined
        ? []
        : Object.keys(codeSchema).filter((mediaType: string) =>
            allowedMediaTypes[key].includes(mediaType),
          );
    const validMediaTypes = matchMediaTypes(code);
    // if we couldn't find based on code, attempt to match against 'default'
    const extendedValidMediaTypes =
      validMediaTypes.length > 0 ? validMediaTypes : matchMediaTypes("default");
    debugLog(
      `filterByMediaType: Valid media types for state and operation: ${JSON.stringify(
        extendedValidMediaTypes,
      )}`,
    );
    if (extendedValidMediaTypes.length === 0) {
      continue;
    }
    // some are valid, add them to the list
    stateCodeToMedia[code] = extendedValidMediaTypes.reduce(
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
    debugLog(
      `getOperations: Fetching operations for specific endpoint '${endpoint}'...`,
    );
    const pathItem = paths[schemaEndpoint];
    if (pathItem === undefined) {
      return err(`endpoint '${endpoint}'`);
    }

    if (isDefMethod) {
      // Specific endpoint, all methods
      debugLog(`getOperations: Fetching operations for any REST method...`);
      const ops = getOperationsFromPathItem(pathItem, endpoint);
      return ops === undefined
        ? err(`any operations under '${endpoint}'`)
        : { operations: ops };
    }

    // Specific endpoint, specific method
    debugLog(
      `getOperations: Fetching operations for REST method '${method}'...`,
    );
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
  debugLog(
    `getOperationsByMethod: Extracting all ${method} operations from ${JSON.stringify(
      paths,
    )}`,
  );
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
    debugLog(`getOperationsByMethod: No matching operations found`);
    return undefined;
  }
  return operations;
};

const getOperationsFromPathItem = (
  pathItem: PathItem,
  endpoint: string,
): OperationsForStateUpdate | undefined => {
  debugLog(
    `getOperationsFromPathItem: Extracting all operations from ${JSON.stringify(
      pathItem,
    )}`,
  );
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
    debugLog(`getOperationsFromPathItem: no operations found`);
    return undefined;
  }
  return operations;
};

const stringHasDSLKeys = (input: string) =>
  DSLKeys.some((key: string) => input.includes(key));

export const chooseBestMatchingError = (
  firstError: IValidationError,
  secondError?: IValidationError,
) => {
  if (secondError === undefined) {
    return firstError;
  }
  const firstHasDSL = stringHasDSLKeys(firstError.msg);
  const secondHasDSL = stringHasDSLKeys(secondError.msg);
  return firstHasDSL && !secondHasDSL
    ? firstError
    : secondHasDSL && !firstHasDSL
    ? secondError
    : firstError.nestedLevel < secondError.nestedLevel
    ? secondError
    : firstError;
};
