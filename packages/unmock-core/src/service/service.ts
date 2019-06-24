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
    Object.keys(oasSchema.paths).forEach((path: string) => {
      if (!OAS_PATH_PARAM_REGEXP.test(path)) {
        return;
      }

      const parametersObjectsArray = getAtLevel(
        oasSchema.paths[path],
        1,
        (k: string, _: any) => k.toLowerCase() === OAS_PARAMS_KW,
      );
      if (parametersObjectsArray.length === 0) {
        throw new Error(
          `Found a dynamic path '${path}' but no description for path parameters!`,
        );
      }
      // Assumption: All methods describe the parameter the same way.
      const parametersInPath = parametersObjectsArray[0].parameters.filter(
        (p: any) => p.in === "path",
      );
    });
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
