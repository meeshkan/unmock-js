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
  public static findPathInObject(
    path: any,
    obj: any,
  ): { [pathKey: string]: any | undefined } | undefined {
    const matches: { [key: string]: any } = {};

    for (const key of Object.keys(path)) {
      if (["string", "number", "boolean"].includes(typeof path[key])) {
        if (isSchema(obj[key])) {
          matches[key] = obj[key];
        } else {
          const nestedMatch = this.matchNested(obj, key);
          matches[key] = nestedMatch;
        }
        continue;
      }

      if (typeof path[key] === "object" && Object.keys(path[key]).length > 0) {
        matches[key] =
          typeof obj[key] !== "object" || Object.keys(obj[key]).length === 0
            ? undefined
            : this.findPathInObject(path[key], obj[key]);
        continue;
      }

      throw new Error(
        `${path[key]} (object '${JSON.stringify(
          path,
        )}' with key '${key}') is not an object, string, number or boolean!`,
      );
    }
    return matches;
  }

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
        [statusCode]: this.verifyResponseWithState(content, state),
      };
    }
    throw new Error(`Not implemented yet for all paths`);
  }

  public static verifyResponseWithState(
    content: MediaType,
    state: UnmockServiceState,
  ) {
    // Employ DFS to iterate over state and see if it matches in response...
    // (For now, ignore $DSL notation and types)
    const responseModsForState = this.findPathInObject(
      state,
      content,
    ) as Record<string, Schema>;
    if (responseModsForState === undefined) {
      throw new Error();
    }
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
