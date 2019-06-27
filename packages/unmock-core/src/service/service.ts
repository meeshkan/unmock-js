import XRegExp from "xregexp";
import { DEFAULT_ENDPOINT } from "./constants";
import {
  HTTPMethod,
  IEndpointToRegexMapping,
  IService,
  IServiceInput,
  IStateInput,
  MatcherResponse,
  OpenAPIObject,
  UnmockServiceState,
} from "./interfaces";
import {
  buildPathRegexStringFromParameters,
  getAtLevel,
  getPathParametersFromPath,
  getPathParametersFromSchema,
} from "./util";

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
  private endpointToRegexp: IEndpointToRegexMapping = {};
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
    // Update the paths in the first level to regex if needed
    if (this.schema === undefined || this.schema.paths === undefined) {
      this.matcher = new OASMatcher({ schema: this.schema });
      return; // empty schema or does not contain paths
    }
    this.buildSchemaRegExps();
    this.hasPaths = // Find this once, as schema is immutable
      this.schema !== undefined &&
      this.schema.paths !== undefined &&
      Object.keys(this.schema.paths).length > 0;
    this.matcher = new OASMatcher({
      endpointToRegexMapping: this.endpointToRegexp,
      schema: this.schema,
    });
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

  public findEndpoint(endpoint: string): string | undefined {
    // Finds the endpoint key that matches given endpoint string
    // First attempts a direct match by dictionary look-up
    // If it fails, iterates over all endpoint until a match is found.
    // Matching path key is returned so that future matching, reference, etc can be done as needed.
    if (!this.hasDefinedPaths) {
      return;
    }
    if (this.schema.paths[endpoint] !== undefined) {
      return endpoint;
    }
    for (const schemaEndpoint of Object.keys(this.schema.paths)) {
      const endpointRegex = this.endpointToRegexp[schemaEndpoint];
      if (endpointRegex === undefined) {
        continue;
      }
      if (endpointRegex.test(endpoint)) {
        return schemaEndpoint;
      }
    }
    return;
  }

  public verifyRequest(method: HTTPMethod, endpoint: string) {
    // Throws if method + endpoint are invalid for this service
    if (!this.hasDefinedPaths) {
      throw new Error(`'${this.name}' has no defined paths!`);
    }

    if (endpoint !== DEFAULT_ENDPOINT) {
      const servicePaths = this.schema.paths;
      const schemaEndpoint = this.findEndpoint(endpoint);
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

  private buildSchemaRegExps() {
    Object.keys(this.schema.paths).forEach((path: string) => {
      const pathParameters = getPathParametersFromPath(path);
      let newPath: string = "";
      if (pathParameters.length === 0) {
        newPath = path; // Simply convert to direct regexp pattern
      } else {
        const schemaParameters = getPathParametersFromSchema(
          this.schema.paths,
          path,
        );
        newPath = buildPathRegexStringFromParameters(
          path,
          schemaParameters,
          pathParameters,
        );
      }

      // Update the content for the new path and remove old path
      const newPathRegex = XRegExp(`^${newPath}$`, "g");
      this.endpointToRegexp[path] = newPathRegex;
    });
  }
}
