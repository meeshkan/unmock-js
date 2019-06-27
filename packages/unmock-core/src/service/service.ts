import { DEFAULT_ENDPOINT } from "./constants";
import {
  HTTPMethod,
  IService,
  IServiceInput,
  IStateInput,
  MatcherResponse,
  OpenAPIObject,
  UnmockServiceState,
} from "./interfaces";
import { getAtLevel } from "./util";

import { OASMatcher } from "./matcher";

import { ISerializedRequest } from "../interfaces";

/**
 * Implements the state management for a service
 */

// TODO: Is there room here for xstate, in the future?

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

  public verifyRequest(method: HTTPMethod, endpoint: string) {
    // Throws if method + endpoint are invalid for this service
    if (!this.hasDefinedPaths) {
      throw new Error(`'${this.name}' has no defined paths!`);
    }

    if (endpoint !== DEFAULT_ENDPOINT) {
      const servicePaths = this.schema.paths;
      const schemaEndpoint = this.matcher.findEndpoint(endpoint);
      if (schemaEndpoint === undefined) {
        // This endpoint does not exist, no need to retain state
        throw new Error(
          `Can't find endpoint '${endpoint}' for '${this.name}'!`,
        );
      }
      if (
        // If the method is 'all', we assume there exists some content under the specified endpoint...
        method !== "all" &&
        servicePaths[schemaEndpoint][method] === undefined
      ) {
        // The endpoint exists but the specified method for that endpoint doesnt
        throw new Error(
          `Can't find response for '${method} ${endpoint}' in ${this.name}!`,
        );
      }
    } else if (method !== "all") {
      // If endpoint is default (all), we make sure that at least one path exists with the given method
      if (
        getAtLevel(this.schema.paths, 1, (k: string, _: any) => k === method)
          .length === 0
      ) {
        throw new Error(
          `Can't find any endpoints with method '${method}' in ${this.name}!`,
        );
      }
    }
  }

  public updateState({ newState }: IStateInput): boolean {
    // Input: method, endpoint, newState
    // Four possible cases:
    // 1. Default endpoint ("**"), default method ("all") =>
    //    applies to all paths with any method where it fits. If none fit -> return false.
    // 2. Default endpoint ("**"), with specific method =>
    //    applies to all paths with that method where it fits. If none fit -> return false.
    // 3. Specific endpoint, default method ("all") =>
    //    applies to all methods in that endpoint, if it fits. If none fit -> return false.
    // 4. Specific endpoint, specific method =>
    //    applies to that combination only. If anything is the state doesn't fit -> return false.
    //

    this.state = newState; // For PR purposes, we just save the state as is.
    return true;
  }
}
