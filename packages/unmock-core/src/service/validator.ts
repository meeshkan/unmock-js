/**
 * Contains logic about validating a state request for a service.
 */

import {
  isSchema,
  MediaType,
  Operation,
  Response,
  Schema,
  UnmockServiceState,
} from "./interfaces";

export class StateRequestValidator {
  /**
   * Given a state request, finds the matching objects
   * within the schema that apply to the request. These
   * are fetched so that one can use the spread operator
   * to overwrite the default schema.
   * The state items are matched by identifying all corresponding
   * keys nested in the path leading to them.
   *
   * @param statePath A state being set in a service (or recursively-called, hence `any`)
   * @param serviceSchema The top-level (or recursely-called, hence `any`) schema for the service
   * @returns An object with string-keys leading to the location of matching state for each variable,
   *          with value being either the Schema defined for that variable, or undefined.
   */
  public static findStatePathInService(
    statePath: any,
    serviceSchema: any,
  ): { [pathKey: string]: any | undefined } {
    const matches: { [key: string]: any } = {};

    for (const key of Object.keys(statePath)) {
      // Traverse along the different paths in the state
      if (["string", "number", "boolean"].includes(typeof statePath[key])) {
        // The value of the current state key is concrete
        // If the service schema contains a matching value (schema), store that one
        // Otherwise recursively look for matching key in nested schema.
        matches[key] = isSchema(serviceSchema[key])
          ? serviceSchema[key]
          : this.matchNested(serviceSchema, key);
      } else if (
        typeof statePath[key] === "object" &&
        Object.keys(statePath[key]).length > 0
      ) {
        // The value of the current state key is a valid object (read: path to definition)
        // If the service schema ends with that key, or does not define more paths - set as undefined
        // Otherwise continue traversing both the state and the service schema
        matches[key] =
          typeof serviceSchema[key] !== "object" ||
          Object.keys(serviceSchema[key]).length === 0
            ? undefined
            : this.findStatePathInService(statePath[key], serviceSchema[key]);
      } else {
        // None of the above - this hints at malformed state (i.e. `{ someKey: undefined }`)
        throw new Error(
          `${statePath[key]} (object '${JSON.stringify(
            statePath,
          )}' with key '${key}') is not an object, string, number or boolean!`,
        );
      }
    }
    return matches;
  }

  /**
   * Given a state and an operation, returns all the valid responses that
   * match the given state.
   * First-level filtering is done via $code (status code) if it exists,
   * otherwise via matching the parameters set in `state`.
   * @param operation
   * @param state
   */
  public static getValidResponsesForOperationWithState(
    operation: Operation,
    state: UnmockServiceState,
  ): { [statusCode: number]: Record<string, Schema> } | undefined {
    // Check if any non-DSL specific elements are found in the Operation under responses.
    // We do not resolve anything at this point.
    const responses = operation.responses;
    const statusCode = state.$code;
    if (statusCode !== undefined) {
      // Applies only to specific response
      const response = (responses as any)[statusCode] as Response;
      if (response === undefined || response.content === undefined) {
        return undefined;
      }
      delete state.$code; // TODO: Remove other top-level DSL elements...
      const content = response.content[Object.keys(response.content)[0]];
      return {
        [statusCode]: this.getUpdatedStateFromContent(content, state),
      };
    }
    throw new Error(`Not implemented yet for all paths`);
  }

  /**
   * Given a media type, return mapping between state, service and response.
   * @param content
   * @param state
   */
  public static getUpdatedStateFromContent(
    content: MediaType,
    state: UnmockServiceState,
  ) {
    // Employ DFS to iterate over state and see if it matches in response...
    // (For now, ignore $DSL notation and types)
    const responseModsForState = this.findStatePathInService(
      state,
      content,
    ) as Record<string, Schema>;
    // TODO: Ignore DSL/convert elements
    // verify none of the elements are `undefined`, throws if some are missing
    const { missingParam } = this.DFSVerifyNoneAreUndefined(
      responseModsForState,
    );
    if (missingParam !== undefined) {
      throw new Error(`Can't find definition for ${missingParam}`);
    }
    return responseModsForState;
  }

  /**
   * Recursively iterates over given `obj` and verifies all values are
   * properly defined.
   * @param obj Object to iterate over
   * @param prevPath (Used internaly) tracked the path to the key that might
   *                 be undefined.
   * @return A dictionary, potentially with `missingParam` holding the path
   *         to a key that holds `undefined` as value.
   */
  private static DFSVerifyNoneAreUndefined(
    obj: any,
    prevPath: string[] = [],
  ): { missingParam?: string } {
    for (const key of Object.keys(obj)) {
      const paramPath = prevPath.concat([key]);
      if (obj[key] === undefined) {
        return { missingParam: paramPath.join("\\") };
      }
      if (typeof obj === "object") {
        return this.DFSVerifyNoneAreUndefined(obj[key], paramPath);
      }
    }
    return {};
  }

  /**
   * Helper method to `findStatePathInService`;
   * Helps find given `pathKey` in `obj` in a recursive manner.
   * @param obj
   * @param pathKey
   * @returns An object leading up to the requested key and it's value in `obj`
   *          or `undefined`.
   */
  private static matchNested(obj: any, pathKey: string) {
    const foundPath: { [key: string]: any } = {};

    if (isSchema(obj[pathKey])) {
      foundPath[pathKey] = obj[pathKey];
    }
    if (typeof obj === "object") {
      Object.keys(obj).forEach((objKey: string) => {
        const subMatches = StateRequestValidator.matchNested(
          obj[objKey],
          pathKey,
        );
        if (subMatches !== undefined) {
          foundPath[objKey] = subMatches;
        }
      });
    }
    return Object.keys(foundPath).length > 0 ? foundPath : undefined;
  }
}
