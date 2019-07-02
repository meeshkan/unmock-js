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
  public static spreadStateFromService(
    serviceSchema: any,
    statePath: any,
  ): { [pathKey: string]: any | undefined } {
    const matches: { [key: string]: any } = {};
    for (const key of Object.keys(statePath)) {
      // Traverse along the different paths in the state
      const scm = serviceSchema[key];
      if (["string", "number", "boolean"].includes(typeof statePath[key])) {
        // The value of the current state key is singular (non-object)
        // If the service schema contains a matching value (schema), store that one
        // Otherwise recursively look for matching key in nested schema.
        matches[key] =
          scm === undefined || scm.properties !== undefined
            ? this.matchNested(serviceSchema, key)
            : scm;
      } else if (
        typeof statePath[key] === "object" &&
        Object.keys(statePath[key]).length > 0
      ) {
        // Keep digging through the state and service schema
        if (typeof scm !== "object" || Object.keys(scm).length === 0) {
          // Nowhere left to traverse, undefined result
          matches[key] = undefined;
        } else {
          const hasProps = scm !== undefined && scm.properties !== undefined;
          // Recursively look into `properties` if they exist, maintaining the path
          const properties = this.spreadStateFromService(
            hasProps ? scm.properties : scm,
            statePath[key],
          );
          matches[key] = hasProps ? { properties } : properties;
        }
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
   * Given a media type, return mapping between state, service and response.
   * @param content
   * @param state
   */
  public static getUpdatedStateFromContent(
    content: MediaType,
    state: UnmockServiceState,
  ) {
    if (content === undefined || content.schema === undefined) {
      throw new Error(`No schema defined in ${JSON.stringify(content)}!`);
    }
    const schema = content.schema as Schema; // We assume '$ref' are already resolved at this stage
    // For now, ignore $DSL notation and types
    const responseModsForState = this.spreadStateFromService(
      schema.properties,
      state,
    ) as Record<string, Schema>; // TODO is this the right type?
    // TODO: Ignore DSL/convert elements
    const { missingParam } = this.DFSVerifyNoneAreUndefined(
      responseModsForState,
    );
    if (missingParam !== undefined) {
      throw new Error(`Can't find definition for ${missingParam}`);
    }
    return responseModsForState;
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
    const relevantResponses: {
      // Maps between a status code, to a response type (e.g. "application/json") to spread state
      [statusCode: string]: Record<string, Record<string, Schema>>;
    } = {};

    if (statusCode !== undefined) {
      // Applies only to specific response
      const response = (responses as any)[statusCode] as Response;
      if (response === undefined || response.content === undefined) {
        return undefined;
      }
      delete state.$code; // TODO: Remove other top-level DSL elements...
      relevantResponses[statusCode] = this.getStateFromMedia(
        response.content,
        state,
      );
      return relevantResponses;
    }
    // If $code is undefined, we look over all responses listed and find the suitable ones
    for (const code of Object.keys(responses)) {
      const response = (responses as any)[code] as Response;
      if (response.content === undefined) {
        continue;
      }
      relevantResponses[code] = this.getStateFromMedia(response.content, state);
    }
    return relevantResponses;
  }

  private static getStateFromMedia(
    contentRecord: Record<string, MediaType>,
    state: UnmockServiceState,
  ) {
    const relevantResponses: {
      [contentType: string]: Record<string, Schema>;
    } = {};
    for (const contentType of Object.keys(contentRecord)) {
      const content = contentRecord[contentType];
      relevantResponses[contentType] = this.getUpdatedStateFromContent(
        content,
        state,
      );
    }
    return relevantResponses;
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
      for (const objKey of Object.keys(obj)) {
        if (typeof obj[objKey] !== "object") {
          continue;
        }
        const subMatches = StateRequestValidator.matchNested(
          obj[objKey],
          pathKey,
        );
        if (subMatches !== undefined) {
          foundPath[objKey] = subMatches;
        }
      }
    }
    return Object.keys(foundPath).length > 0 ? foundPath : undefined;
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
}
