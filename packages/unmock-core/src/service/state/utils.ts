import debug from "debug";
import {
  DEFAULT_STATE_ENDPOINT,
  DEFAULT_STATE_HTTP_METHOD,
} from "../constants";
import {
  ExtendedHTTPMethod,
  HTTPMethod,
  isRESTMethod,
  Operation,
  PathItem,
  Paths,
} from "../interfaces";
import { OASMatcher } from "../matcher";
import { IStateUpdate, OperationsForStateUpdate } from "./interfaces";

type PathKey = keyof PathItem & HTTPMethod;

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
  serviceName,
  matcher,
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
    const pathItem = getPathItem(endpoint, matcher, paths);
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

const getPathItem = (
  endpoint: string,
  matcher: OASMatcher,
  paths: Paths,
): PathItem | undefined => {
  const keyOfEndpointInSchema = matcher.findEndpoint(endpoint);
  if (keyOfEndpointInSchema === undefined) {
    return undefined;
  }
  return paths[keyOfEndpointInSchema];
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
          operation: pathItem[operationKey as PathKey] as Operation,
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
