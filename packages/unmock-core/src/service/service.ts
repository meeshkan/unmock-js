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

type OperationsForStateUpdate = Array<{
  endpoint: string;
  method: HTTPMethod;
  operation: Operation;
}>;

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

  public updateState({ method, endpoint, newState }: IStateInput): boolean {
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
    const operations = this.getOperationsOrThrow(method, endpoint);
    // Verify and save state for each operation...
    this.state = newState; // For PR purposes, we just save the state as is.
    return true;
  }

  private getOperationsOrThrow(
    method: ExtendedHTTPMethod,
    endpoint: string,
  ): OperationsForStateUpdate {
    if (endpoint !== DEFAULT_ENDPOINT) {
      const pathItem = this.getPathItemOrThrow(endpoint);
      if (method !== DEFAULT_HTTP_METHOD) {
        return [
          {
            endpoint,
            method,
            operation: this.getOperationOrThrow({
              endpoint,
              method,
              pathItem,
            }),
          },
        ];
      } else {
        return this.getOperationsFromPathItemOrThrow(pathItem, endpoint);
      }
    } else {
      return this.getOperationsWithMethodOrThrow(method);
    }
  }

  private getPathItemOrThrow(endpoint: string): PathItem {
    const keyOfEndpointInSchema = this.matcher.findEndpoint(endpoint);
    if (keyOfEndpointInSchema === undefined) {
      // This endpoint does not exist, no need to retain state
      throw new Error(`Can't find endpoint '${endpoint}' for '${this.name}'!`);
    }
    return this.schema.paths[keyOfEndpointInSchema];
  }

  private getOperationOrThrow({
    method,
    endpoint,
    pathItem,
  }: {
    method: HTTPMethod;
    endpoint: string;
    pathItem: PathItem;
  }): Operation {
    const operation = pathItem[method];
    // Applies to specific endpoint and method
    if (operation === undefined) {
      // The endpoint exists but the specified method for that endpoint doesnt
      throw new Error(
        `Can't find response for '${method} ${endpoint}' in '${this.name}'!`,
      );
    }
    return operation;
  }

  private getOperationsWithMethodOrThrow(
    method: ExtendedHTTPMethod,
  ): OperationsForStateUpdate {
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
      throw new Error(
        `Can't find any endpoints ` +
          `${anyMethod ? "with operations" : `with method '${method}'`}` +
          ` in '${this.name}'!`,
      );
    }
    return operations;
  }

  private getOperationsFromPathItemOrThrow(
    pathItem: PathItem,
    endpoint: string,
  ): OperationsForStateUpdate {
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
      throw new Error(
        `There are no operations under '${endpoint}' in '${this.name}'!`,
      );
    }
    return operations;
  }
}
