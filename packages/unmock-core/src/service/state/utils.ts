import debug from "debug";
import {
  HTTPMethod,
  isRESTMethod,
  toLowerCaseHttpMethod,
} from "../../interfaces";
import {
  DEFAULT_STATE_ENDPOINT,
  DEFAULT_STATE_HTTP_METHOD,
} from "../constants";
import { DSLKeys } from "../dsl/interfaces";

import {
  ExtendedHTTPMethod,
  OASMethodKey,
  Operation,
  PathItem,
  Paths,
} from "../interfaces";
import {
  IStateUpdate,
  IValidationError,
  OperationsForStateUpdate,
} from "./interfaces";

const debugLog = debug("unmock:state:utils");

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
    const lowerCaseMethod = toLowerCaseHttpMethod(method as HTTPMethod);
    const op = pathItem[lowerCaseMethod];
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
    ? (pathMethod: string) => isRESTMethod(pathMethod)
    : (pathMethod: string) => pathMethod === method;

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
  const operations: OperationsForStateUpdate = Object.keys(pathItem)
    .filter(key => isRESTMethod(key) && pathItem[key] !== undefined)
    .map(key => ({
      endpoint,
      method: key as HTTPMethod,
      operation: pathItem[key as HTTPMethod] as Operation,
    }));
  if (operations.length === 0) {
    debugLog(`getOperationsFromPathItem: no operations found`);
    return undefined;
  }
  return operations;
};

const stringHasDSLKeys = (input: string) =>
  DSLKeys.some((key: string) => input.includes(key));

const chooseBestMatchingError = (
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

// TODO: Maybe use fp-ts' Validation type here?
export const chooseErrorFromList = (
  errList: Array<IValidationError | undefined>,
) =>
  errList.reduce(
    (e, c) => (c === undefined ? e : chooseBestMatchingError(c, e)),
    undefined,
  );

/**
 * Converts an OpenAPI parameter to a wildcard without validating against the schema.
 * @example /pets/{pet_id} -> /pets/*
 * @param endpoint
 */
export const convertEndpointToWildcard = (endpoint: string) =>
  endpoint.replace(/\{[^}]*?\}/g, "*");
