/**
 * Contains logic about validating a state request for a service.
 */

import Ajv from "ajv";
import { DSL } from "../dsl";
import {
  codeToMedia,
  isReference,
  isSchema,
  IStateInputGenerator,
  MediaType,
  Operation,
  Responses,
  Schema,
} from "../interfaces";

// These are specific to OAS and not part of json schema standard
const ajv = new Ajv({ unknownFormats: ["int32", "int64"] });

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
  state: IStateInputGenerator,
): { responses?: codeToMedia; error?: string } => {
  // Check if any non-DSL specific elements are found in the Operation under responses.
  // We do not resolve anything at this point.
  const responses = operation.responses;
  const relevantResponses: codeToMedia = {};
  let error: IMissingParam | undefined;

  // TODO: Treat other top-level DSL elements...
  const statusCode = state.top.$code;
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
  state: IStateInputGenerator,
): {
  responses: IResponsesFromContent;
  errors: IMissingParam[];
} => {
  const errors: IMissingParam[] = [];
  const relevantResponses: IResponsesFromContent = {};
  for (const contentType of Object.keys(contentRecord)) {
    const content = contentRecord[contentType];
    if (content === undefined || content.schema === undefined) {
      errors.push({
        msg: `No schema defined in '${JSON.stringify(content)}'!`,
        nestedLevel: -1,
      });
      continue;
    }
    // We assume '$ref' are already resolved at this stage
    const spreadState = state.gen(content.schema as Schema);

    const missingParam = DFSVerifyNoneAreNull(spreadState);
    if (missingParam !== undefined) {
      errors.push(missingParam);
    } else {
      relevantResponses[contentType] = spreadState;
    }
  }
  return { responses: relevantResponses, errors };
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
    const scm = serviceSchema[key];
    const stateValue = statePath[key];

    if (scm === undefined) {
      if (hasNestedItems(serviceSchema)) {
        // Option 1: current schema has no matching key, but contains indirection (items/properties, etc)
        const spread = oneLevelOfIndirectNestedness(serviceSchema, statePath);
        if (Object.keys(spread).length === 0) {
          spread[key] = null;
        }
        matches = { ...matches, ...spread };
      }
    } else if (scm !== undefined) {
      if (isConcreteValue(stateValue)) {
        // Option 2: Current scheme has matching key, and the state specifies a non-object (or schema). Validate schema.
        // TODO do we want to throw for invalid types?
        const spread = {
          [key]:
            isSchema(scm) && ajv.validate(scm, stateValue) ? stateValue : null,
        };
        matches = { ...matches, ...spread };
      } else if (hasNestedItems(scm) || isNonEmptyObject(scm)) {
        // Option 3: Current scheme has matching key, state specifies an object - traverse schema and indirection
        // `stateValue` at this point may also contain DSL elements, so we parse them before moving onwards
        const translated = DSL.translateDSLToOAS(stateValue, scm);
        const spread = {
          [key]: { ...spreadStateFromService(scm, stateValue), ...translated },
        };
        matches = {
          ...matches,
          ...oneLevelOfIndirectNestedness(scm, statePath, spread),
        };
      } else {
        // Option 4: Current schema has matching key, but state specifies an object and schema has final value
        matches[key] = null;
      }
    } else {
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
        msg: `Can't find definition for '${key}', or its type is incorrect`,
        nestedLevel,
      };
    }
    if (typeof obj[key] === "object") {
      return DFSVerifyNoneAreNull(obj[key], nestedLevel + 1);
    }
  }
  return undefined;
};
