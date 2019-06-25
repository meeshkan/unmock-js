import { getAtLevel } from "../util";
import { OAS_PARAMS_KW, OAS_PATH_PARAM_REGEXP } from "./constants";
import { HTTPMethod, IUnmockServiceState, OASSchema } from "./interfaces";

/**
 * Implements the state management for a service
 */

// TODO: Is there room here for xstate, in the future?
// TODO: Add IService
export class Service {
  // Maintains a state for service
  // First level kv pairs: paths -> methods
  // Second level kv pairs: methods -> status codes
  // Third level kv pairs: status codes -> response template overrides
  // Fourth and beyond: template-specific.
  // @ts-ignore
  private state: IUnmockServiceState = {};
  constructor(private oasSchema: OASSchema) {
    // Update the paths in the first level to regex if needed
    if (oasSchema === undefined || oasSchema.paths === undefined) {
      return; // empty schema or does not contain paths
    }
    this.__updateSchemaPaths();
  }

  get schema(): OASSchema {
    return this.oasSchema;
  }

  public updateState({
    // @ts-ignore
    method,
    // @ts-ignore
    endpoint,
    newState,
  }: {
    method: HTTPMethod;
    endpoint: string;
    newState: IUnmockServiceState;
  }) {
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

  private __updateSchemaPaths() {
    Object.keys(this.oasSchema.paths).forEach((path: string) => {
      const regexResults = OAS_PATH_PARAM_REGEXP.exec(path);
      if (regexResults === null) {
        return;
      }
      const pathParameters = regexResults.slice(1); // Get all matches

      const parametersArray = getAtLevel(
        this.oasSchema.paths[path],
        1,
        (k: string, _: any) => k === OAS_PARAMS_KW,
        true, // Get `parameters` object and return its values
      );
      if (parametersArray.length === 0) {
        throw new Error(
          `Found a dynamic path '${path}' but no description for path parameters!`,
        );
      }
      let newPath = `${path}`;
      // Assumption: All methods describe the parameter the same way.
      parametersArray[0].forEach((p: any) => {
        const paramLoc = pathParameters.indexOf(p.name);
        if (p.in === "path" && paramLoc !== -1) {
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
          `Found a dynamic path '${path}' but the following path parameters have not been described: ${JSON.stringify(
            pathParameters,
          )}!`,
        );
      }
      // Update the content for the new path and remove old path
      delete Object.assign(this.oasSchema.paths, {
        [newPath]: this.oasSchema.paths[path],
      })[path];
    });
  }

  // TODO
  // private verifyPathAndMethod(method: HTTPMethod, path: string) {
  //   if (path === DEFAULT_ENDPOINT) {
  //     if (method === DEFAULT_REST_METHOD) {
  //       return this.oasSchema.paths !== undefined;
  //     } else {
  //       // just make sure we have some entry that matches the method in that level
  //       return getAtLevel(this.schema, 1, (k, _) => k === method).length > 0;
  //     }
  //   } else {
  //     // make sure the combination exists
  //   }
  // }
}
