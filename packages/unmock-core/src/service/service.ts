import debug from "debug";
import { ISerializedRequest } from "../interfaces";
import { DEFAULT_ENDPOINT, DEFAULT_HTTP_METHOD } from "./constants";
import {
  ExtendedHTTPMethod,
  HTTPMethod,
  IService,
  IServiceInput,
  isRESTMethod,
  IStateInput,
  MatcherResponse,
  OpenAPIObject,
  Operation,
  PathItem,
  UnmockServiceState,
} from "./interfaces";
import { OASMatcher } from "./matcher";

const debugLog = debug("unmock:service");

interface IOperationForStateUpdate {
  endpoint: string;
  method: HTTPMethod;
  operation: Operation;
}
type OperationsForStateUpdate = IOperationForStateUpdate[];

/**
 * Implements the state management for a service
 */

export class Service implements IService {
  public readonly name: string;
  private hasPaths: boolean = false;
  private readonly oasSchema: OpenAPIObject;
  private readonly matcher: OASMatcher;
  /**
   * Maintains a state for service
   * First level kv pairs: paths -> methods
   * Second level kv pairs: methods -> status codes
   * Third level kv pairs: status codes -> response template overrides
   * Fourth and beyond: template-specific.
   */
  // @ts-ignore // ignored because it's currently only being read and not written
  private state: UnmockServiceState = {};

  constructor(opts: IServiceInput) {
    this.oasSchema = opts.schema;
    this.name = opts.name;
    this.hasPaths = // Find this once, as schema is immutable
      this.schema !== undefined &&
      this.schema.paths !== undefined &&
      Object.keys(this.schema.paths).length > 0;
    this.matcher = new OASMatcher({ schema: this.schema });
  }

  get schema(): OpenAPIObject {
    return this.oasSchema;
  }

  get hasDefinedPaths(): boolean {
    return this.hasPaths;
  }

  public match(sreq: ISerializedRequest): MatcherResponse {
    return this.matcher.matchToOperationObject(sreq);
  }

  public updateState({
    method,
    endpoint,
    // @ts-ignore TODO
    newState,
  }: IStateInput): { success: boolean; error?: string } {
    // Four possible cases:
    // 1. Default endpoint ("**"), default method ("any") =>
    //    applies to all paths with any method where it fits. If none fit -> return false.
    // 2. Default endpoint ("**"), with specific method =>
    //    applies to all paths with that method where it fits. If none fit -> return false.
    // 3. Specific endpoint, default method ("any") =>
    //    applies to all methods in that endpoint, if it fits. If none fit -> return false.
    // 4. Specific endpoint, specific method =>
    //    applies to that combination only. If anything is the state doesn't fit -> return false.
    //
    if (!this.hasDefinedPaths) {
      throw new Error(`'${this.name}' has no defined paths!`);
    }
    debugLog(`Fetching operations for '${method} ${endpoint}'...`);
    const { operations, error } = this.getOperations(method, endpoint);
    if (error !== undefined) {
      debugLog(`Couldn't find any matching operations: ${error}`);
      return { success: false, error };
    }
    debugLog(`Found follow operations: ${operations}`);

    operations.forEach((op: IOperationForStateUpdate) => {
      // For each operation, verify the new state applies and save in `this.state`
    });

    return { success: true };
  }

  /**
   * Gets relevant operations for given method and endpoint, filtering out
   * any endpoints/method combinations that do not match.
   * @returns An object with operations and possibly an error message. If
   *          error is defined, operations is guaranteed to be an empty array.
   *          An error is always an indication that something couldn't be found
   *          with the given (method, endpoint) combination in this service.
   */
  private getOperations(
    method: ExtendedHTTPMethod,
    endpoint: string,
  ): { operations: OperationsForStateUpdate; error?: string } {
    const isDefMethod = method === DEFAULT_HTTP_METHOD;
    // Short handle for returning a failed result
    const errPref = "Can't find ";
    const errSuff = ` in '${this.name}'!`;
    const err = (msg: string) => ({
      operations: [],
      error: errPref + msg + errSuff,
    });

    if (endpoint !== DEFAULT_ENDPOINT) {
      debugLog(`Fetching operations for specific endpoint '${endpoint}'...`);
      const pathItem = this.getPathItem(endpoint);
      if (pathItem === undefined) {
        return err(`endpoint '${endpoint}'`);
      }

      if (isDefMethod) {
        // Specific endpoint, all methods
        debugLog(`Fetching operations for any REST method...`);
        const ops = this.getOperationsFromPathItem(pathItem, endpoint);
        return ops === undefined
          ? err(`any operations under '${endpoint}'`)
          : { operations: ops };
      }

      // Specific endpoint, specific method
      debugLog(`Fetching operations for REST method '${method}'...`);
      method = method as HTTPMethod;
      const op = pathItem[method];
      return op === undefined
        ? err(`response for '${method} ${endpoint}'`)
        : {
            operations: [
              {
                endpoint,
                method,
                operation: op,
              },
            ],
          };
    }
    // any endpoint
    debugLog(`Fetching operations for any endpoint...`);
    const operations = this.getOperationsByMethod(method);
    return operations === undefined
      ? err(
          `any endpoints with ` +
            `${isDefMethod ? "operations" : `method '${method}'`}`,
        )
      : { operations };
  }

  private getPathItem(endpoint: string): PathItem | undefined {
    const keyOfEndpointInSchema = this.matcher.findEndpoint(endpoint);
    if (keyOfEndpointInSchema === undefined) {
      return undefined;
    }
    return this.schema.paths[keyOfEndpointInSchema];
  }

  private getOperationsByMethod(
    method: ExtendedHTTPMethod,
  ): OperationsForStateUpdate | undefined {
    const anyMethod = method === DEFAULT_HTTP_METHOD;
    const filterFn = anyMethod
      ? (pathItemKey: string) => isRESTMethod(pathItemKey)
      : (pathItemKey: string) => pathItemKey === method;

    const operations: OperationsForStateUpdate = Object.keys(
      this.schema.paths,
    ).reduce((ops: OperationsForStateUpdate, path: string) => {
      // For each path, we reduce the relevant methods (= operations)
      const pathItem = this.schema.paths[path];
      const pathOperations = Object.keys(pathItem).reduce(
        (pathOps: OperationsForStateUpdate, maybeOperationKey: string) =>
          filterFn(maybeOperationKey)
            ? pathOps.concat([
                {
                  endpoint: path,
                  method: maybeOperationKey as HTTPMethod,
                  operation: (pathItem as any)[maybeOperationKey],
                },
              ])
            : pathOps,
        [],
      );
      return ops.concat(pathOperations);
    }, []);
    if (operations.length === 0) {
      return undefined;
    }
    return operations;
  }

  private getOperationsFromPathItem(
    pathItem: PathItem,
    endpoint: string,
  ): OperationsForStateUpdate | undefined {
    const operations: OperationsForStateUpdate = [];
    Object.keys(pathItem).forEach((key: string) => {
      if (isRESTMethod(key)) {
        const method = key as HTTPMethod;
        const operation = (pathItem as any)[key] as Operation;
        if (operation !== undefined) {
          operations.push({ endpoint, method, operation });
        }
      }
    });
    if (operations.length === 0) {
      return undefined;
    }
    return operations;
  }
}
