import XRegExp from "xregexp";
import { getAtLevel } from "../util";
import {
  DEFAULT_ENDPOINT,
  DEFAULT_REST_METHOD,
  OAS_PATH_PARAM_REGEXP,
  OAS_PATH_PARAMS_KW,
  UNMOCK_PATH_REGEX_KW,
} from "./constants";
import {
  HTTPMethod,
  IService,
  IStateInput,
  IUnmockServiceState,
  OASSchema,
} from "./interfaces";

/**
 * Implements the state management for a service
 */

// TODO: Is there room here for xstate, in the future?

export class Service implements IService {
  // Maintains a state for service
  // First level kv pairs: paths -> methods
  // Second level kv pairs: methods -> status codes
  // Third level kv pairs: status codes -> response template overrides
  // Fourth and beyond: template-specific.
  // @ts-ignore // ignored because it's currently only being read and not written
  private state: IUnmockServiceState = {};
  private hasPaths: boolean = false;

  constructor(private oasSchema: OASSchema, private name: string) {
    // Update the paths in the first level to regex if needed
    if (oasSchema === undefined || oasSchema.paths === undefined) {
      return; // empty schema or does not contain paths
    }
    this.updateSchemaPaths();
    this.hasPaths = // Find this once, as schema is immutable
      this.schema !== undefined &&
      this.schema.paths !== undefined &&
      Object.keys(this.schema.paths).length > 0;
  }

  get schema(): OASSchema {
    return this.oasSchema;
  }

  get hasDefinedPaths(): boolean {
    return this.hasPaths;
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
      const endpointRegex = this.schema.paths[schemaEndpoint][
        UNMOCK_PATH_REGEX_KW
      ] as RegExp;

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
        method !== DEFAULT_REST_METHOD &&
        servicePaths[schemaEndpoint][method] === undefined
      ) {
        // The endpoint exists but the specified method for that endpoint doesnt
        throw new Error(
          `Can't find response for '${method} ${endpoint}' in ${this.name}!`,
        );
      }
    } else if (method !== DEFAULT_REST_METHOD) {
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

  private updateSchemaPaths() {
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
      this.oasSchema.paths[path][UNMOCK_PATH_REGEX_KW] = newPathRegex;
    });
  }
}

const getPathParametersFromPath = (path: string): string[] => {
  const pathParameters: string[] = [];
  XRegExp.forEach(path, OAS_PATH_PARAM_REGEXP, (matchArr: RegExpExecArray) => {
    pathParameters.push(matchArr[1]);
  });
  return pathParameters;
};

const getPathParametersFromSchema = (
  schema: OASSchema,
  path: string,
): any[] => {
  const schemaPathParameters = getAtLevel(
    schema[path],
    2,
    (_: string, v: any) => v.in === OAS_PATH_PARAMS_KW,
  );
  if (
    schemaPathParameters.length === 0 ||
    Object.keys(schemaPathParameters[0]).length === 0
  ) {
    throw new Error(
      `Found a dynamic path '${path}' but no description for path parameters!`,
    );
  }
  return schemaPathParameters;
};

const buildPathRegexStringFromParameters = (
  path: string,
  schemaParameters: any[],
  pathParameters: string[],
): string => {
  let newPath = `${path}`;
  // Assumption: All methods describe the parameter the same way.
  Object.values(schemaParameters[0]).forEach((p: any) => {
    const paramLoc = pathParameters.indexOf(p.name);
    if (paramLoc !== -1) {
      // replace the original path with regex as needed
      // for now, we ignore the schema.type and use a generic pattern
      // the pattern is named for later retrieval
      newPath = newPath.replace(`{${p.name}}`, `(?<${p.name}>[^/]+)`);
      pathParameters.splice(paramLoc, 1); // remove from pathParameters after matching
    }
  });
  if (pathParameters.length > 0) {
    // not all elements have been replaced!
    throw new Error(
      `Found a dynamic path '${path}' but the following path ` +
        `parameters have not been described: ${pathParameters}!`,
    );
  }
  return newPath;
};
