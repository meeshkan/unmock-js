/**
 * Contains logic about validating a state request for a service.
 */

import {
  IResponsesFromOperation,
  isReference,
  isSchema,
  MediaType,
  Operation,
  Responses,
  Schema,
  UnmockServiceState,
} from "../interfaces";

type codeType = keyof Responses;

interface IResponsesFromContent {
  [contentType: string]: Record<string, Schema>;
}

interface IMissingParam {
  msg: string;
  nestedLevel: number;
}

// Items that hold nested contents in OAS
const NESTED_SCHEMA_ITEMS = ["properties", "items", "additionalProperties"];

const hasNestedItems = (obj: any) =>
  NESTED_SCHEMA_ITEMS.some((key: string) => obj[key] !== undefined);

const isConcreteValue = (obj: any) =>
  ["string", "number", "boolean"].includes(typeof obj);

const isNonEmptyObject = (obj: any) =>
  typeof obj === "object" && Object.keys(obj).length > 0;

const chooseDeepestMissingParam = (
  errorList: IMissingParam[],
  initError?: IMissingParam,
) =>
  errorList.reduce(
    (err: IMissingParam | undefined, cerr: IMissingParam) =>
      err === undefined || err.nestedLevel < cerr.nestedLevel ? cerr : err,
    initError,
  );

const oneLevelOfIndirectNestedness = (
  schema: any,
  path: any,
  internalObj: { [key: string]: any } = {},
) => {
  for (const key of NESTED_SCHEMA_ITEMS) {
    if (schema[key] !== undefined) {
      const maybeContents = spreadStateFromService(schema[key], path);
      if (
        maybeContents !== undefined &&
        Object.keys(maybeContents).length > 0
      ) {
        internalObj[key] = maybeContents;
      }
    }
  }
  return internalObj;
};

/**
 * Given a state and an operation, returns all the valid responses that
 * match the given state.
 * First-level filtering is done via $code (status code) if it exists,
 * otherwise via matching the parameters set in `state`.
 * @param operation
 * @param state
 */
export const getValidResponsesForOperationWithState = (
  operation: Operation,
  state: UnmockServiceState,
): { responses?: IResponsesFromOperation; error?: string } => {
  // Check if any non-DSL specific elements are found in the Operation under responses.
  // We do not resolve anything at this point.
  const responses = operation.responses;
  const relevantResponses: IResponsesFromOperation = {};
  let error: IMissingParam | undefined;

  // TODO: Treat other top-level DSL elements...
  const statusCode = state.$code;
  // If $code is undefined, we look over all responses listed and find the suitable ones
  const codes =
    statusCode === undefined ? Object.keys(responses) : [statusCode];
  if (statusCode !== undefined) {
    // Applies only to specific response
    const response = responses[String(statusCode) as codeType];
    if (
      response === undefined ||
      isReference(response) ||
      response.content === undefined
    ) {
      return {
        error: `Can't find response for given status code '${statusCode}'!`,
      };
    }
    delete state.$code;
  }

  for (const code of codes) {
    const response = responses[code as codeType];
    if (
      response === undefined ||
      isReference(response) ||
      response.content === undefined
    ) {
      continue;
    }
    const stateMedia = getStateFromMedia(response.content, state);
    if (Object.keys(stateMedia.responses).length > 0) {
      relevantResponses[code] = stateMedia.responses;
    }
    error = chooseDeepestMissingParam(stateMedia.errors, error);
  }
  if (Object.keys(relevantResponses).length > 0) {
    return { responses: relevantResponses };
  }
  return {
    error:
      error === undefined
        ? "Couldn't find a matching response but no errors were reported... Please let us know!"
        : error.msg,
  };
};

const getStateFromMedia = (
  contentRecord: Record<string, MediaType>,
  state: UnmockServiceState,
): {
  responses: IResponsesFromContent;
  errors: IMissingParam[];
} => {
  const errors: IMissingParam[] = [];
  const relevantResponses: IResponsesFromContent = {};
  for (const contentType of Object.keys(contentRecord)) {
    const content = contentRecord[contentType];
    const { spreadState, error } = getUpdatedStateFromContent(content, state);
    if (error !== undefined) {
      errors.push(error);
    }
    if (spreadState !== undefined) {
      relevantResponses[contentType] = spreadState;
    }
  }
  return { responses: relevantResponses, errors };
};

/**
 * Given a media type, return mapping between state, service and response.
 * @param content
 * @param state
 */
// TODO: exported for testing purposes
export const getUpdatedStateFromContent = (
  content: MediaType,
  state: UnmockServiceState,
): { spreadState?: Record<string, Schema>; error?: IMissingParam } => {
  if (content === undefined || content.schema === undefined) {
    return {
      error: {
        msg: `No schema defined in ${JSON.stringify(content)}!`,
        nestedLevel: -1,
      },
    };
  }
  const schema = content.schema as Schema; // We assume '$ref' are already resolved at this stage
  // For now, ignore $DSL notation and types
  const responseModsForState = spreadStateFromService(schema, state) as Record<
    string,
    Schema
  >;

  // TODO: Ignore DSL/convert elements
  const missingParam = DFSVerifyNoneAreNull(responseModsForState);
  if (missingParam !== undefined) {
    return { error: missingParam };
  }
  return { spreadState: responseModsForState };
};

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
 *          with value being either the Schema defined for that variable, or null.
 * @throws  If a state path is defined in such a way, that the nested state isn't an object, string,
 *          number or boolean (i.e. `{ path: { to: { state: undefined } } }` )
 */
// TODO: exported for testing purposes
export const spreadStateFromService = (
  serviceSchema: any,
  statePath: any,
): { [pathKey: string]: any | null } => {
  let matches: { [key: string]: any } = {};
  for (const key of Object.keys(statePath)) {
    // Traverse along the different paths in the state
    const scm = serviceSchema[key];
    if (isConcreteValue(statePath[key])) {
      // The value of the current state key is concrete (non-object)
      // If the service schema contains a matching value (schema), store that one
      // Otherwise recursively look for matching key in nested schema.
      let nested =
        scm === undefined || hasNestedItems(scm)
          ? matchNested(serviceSchema, key)
          : scm;
      if (nested === undefined) {
        nested = { [key]: null }; // Note that `key` was missing
      }
      matches = { ...matches, ...nested };
    } else if (isNonEmptyObject(statePath[key])) {
      // Keep digging through the state and service schema
      if (scm === undefined && hasNestedItems(serviceSchema)) {
        // Option 1: current schema has no matching key, but contains nested items. Traverse schema.
        const spread = oneLevelOfIndirectNestedness(serviceSchema, statePath);
        if (Object.keys(spread).length === 0) {
          spread[key] = null;
        }
        matches = { ...matches, ...spread };
      } else if (scm !== undefined) {
        if (hasNestedItems(scm) || isNonEmptyObject(scm)) {
          // Option 2: current schema has matching key. Traverse schema, nested items and state.
          const spread = { [key]: spreadStateFromService(scm, statePath[key]) };
          matches = {
            ...matches,
            ...oneLevelOfIndirectNestedness(scm, statePath, spread),
          };
        } else {
          // Option 3: current schema has no matching key and does not contain nested items,
          //           or has matching key and it's non-traversable type. Stop traversal.
          matches[key] = null;
        }
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
};

/**
 * Helper method to `findStatePathInService`;
 * Helps find given `pathKey` in `obj` in a recursive manner.
 * @param obj
 * @param pathKey
 * @returns An object leading up to the requested key and it's value in `obj`
 *          or `undefined`.
 */
const matchNested = (obj: any, pathKey: string) => {
  const foundPath: { [key: string]: any } = {};

  if (isSchema(obj[pathKey])) {
    foundPath[pathKey] = obj[pathKey];
  }
  if (typeof obj === "object") {
    for (const objKey of Object.keys(obj)) {
      if (typeof obj[objKey] !== "object") {
        continue;
      }
      const subMatches = matchNested(obj[objKey], pathKey);
      if (subMatches !== undefined) {
        foundPath[objKey] = subMatches;
      }
    }
  }
  return Object.keys(foundPath).length > 0 ? foundPath : undefined;
};

/**
 * Recursively iterates over given `obj` and verifies all values are
 * properly defined.
 * @param obj Object to iterate over
 * @param prevPath (Used internaly) tracked the path to the key that might
 *                 be undefined.
 * @return An IMissingParam if some missing parameter is found, or undefined if no parameters are missing.
 */
const DFSVerifyNoneAreNull = (
  obj: any,
  nestedLevel: number = 0,
): IMissingParam | undefined => {
  for (const key of Object.keys(obj)) {
    if (obj[key] === null) {
      return {
        msg: `Can't find definition for '${key}'`,
        nestedLevel,
      };
    }
    if (typeof obj[key] === "object") {
      return DFSVerifyNoneAreNull(obj[key], nestedLevel + 1);
    }
  }
  return undefined;
};
