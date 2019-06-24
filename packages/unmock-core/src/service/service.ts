import { filter as _filter } from "lodash";
import { getAtLevel } from "../util";
import { DEFAULT_ENDPOINT, DEFAULT_REST_METHOD } from "./constants";
import { HTTPMethod, IStateMapping, OASSchema } from "./interfaces";

/**
 * Implements the state management for a service
 */

// TODO: Is there room here for xstate, in the future?

export class Service {
  // Maintains a state for service
  // First level kv pairs: paths -> methods
  // Second level kv pairs: methods -> status codes
  // Third level kv pairs: status codes -> response template overrides
  // Fourth and beyond: template-specific.
  private state: IStateMapping = {};
  constructor(private oasSchema: OASSchema) {}

  get schema(): OASSchema {
    return this.oasSchema;
  }

  public updateState({
    method,
    endpoint,
    newState,
  }: {
    method: HTTPMethod;
    endpoint: string;
    newState: IStateMapping;
  }) {
    // Input: method, endpoint, newState
    // Four possible cases:
    // 1. Default endpoint ("**"), default method ("all") => applies to all paths with any method where it fits. If none fit -> throw an error.
    // 2. Default endpoint ("**"), with specific method => applies to all paths with that method where it fits. If none fit -> throw an error.
    // 3. Specific endpoint, default method ("all") => applies to all methods in that endpoint, if it fits. If none fit -> throw an error.
    // 4. Specific endpoint, specific method => applies to that combination only. If anything is the state doesn't fit -> throw an error.
    //
    // We start with the trivial case, specific endpoint and method:
    if (endpoint !== DEFAULT_ENDPOINT && method !== DEFAULT_REST_METHOD) {
    }
  }

  private verifyPathAndMethod(method: HTTPMethod, path: string) {
    if (path === DEFAULT_ENDPOINT) {
      if (method === DEFAULT_REST_METHOD) {
        return this.oasSchema.paths !== undefined;
      } else {
        // just make sure we have some entry that matches the method in that level
        return getAtLevel(this.schema, 1, (k, _) => k === method).length > 0;
      }
    } else {
      // make sure the combination exists
    }
  }
}
