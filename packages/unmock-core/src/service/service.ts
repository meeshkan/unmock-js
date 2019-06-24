import { filter as _filter } from "lodash";
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
  constructor(private oasSchema: OASSchema) {}

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
