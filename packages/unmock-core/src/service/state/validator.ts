/**
 * Contains logic about validating a state request for a service.
 */

import {
  codeToMedia,
  isReference,
  IStateInputGenerator,
  MediaType,
  Operation,
  Reference,
  Response,
  Responses,
  Schema,
} from "../interfaces";

type codeType = keyof Responses;

interface IResponsesFromContent {
  [contentType: string]: Record<string, Schema> | Schema;
}

interface IMissingParam {
  msg: string;
  nestedLevel: number;
}

const chooseDeepestMissingParam = (
  errorList: IMissingParam[],
  initError?: IMissingParam,
) =>
  errorList.reduce(
    (err: IMissingParam | undefined, cerr: IMissingParam) =>
      err === undefined || err.nestedLevel < cerr.nestedLevel ? cerr : err,
    initError,
  );

const responseForStateWithCode = (
  response: Reference | Response | undefined,
  state: IStateInputGenerator,
  code: number,
): { responses?: codeToMedia; error?: string } => {
  if (
    response === undefined ||
    isReference(response) ||
    response.content === undefined
  ) {
    return {
      error: `Can't find response for given status code '${code}'!`,
    };
  }
  const stateMedia = getStateFromMedia(response.content, state);
  const error = chooseDeepestMissingParam(stateMedia.errors);
  return {
    responses: { [code]: stateMedia.responses },
    error: error === undefined ? undefined : error.msg,
  };
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

  const statusCode = state.top.$code;
  // If $code is undefined, we look over all responses listed and find the suitable ones
  if (statusCode !== undefined) {
    // Applies only to specific response
    return responseForStateWithCode(
      responses[String(statusCode) as codeType],
      state,
      statusCode,
    );
  }

  for (const code of Object.keys(responses)) {
    const response = responses[code as codeType];
    if (
      response === undefined ||
      isReference(response) ||
      response.content === undefined
    ) {
      continue;
    }
    const stateMedia = getStateFromMedia(response.content, state);
    const filteredStateMedia = Object.keys(stateMedia.responses).reduce(
      (acc: IResponsesFromContent, contentType: string) => {
        const schemaOrRecord = stateMedia.responses[contentType];
        if (Object.keys(schemaOrRecord).length > 0) {
          acc[contentType] = schemaOrRecord;
        }
        return acc;
      },
      {},
    );
    if (Object.keys(filteredStateMedia).length > 0) {
      relevantResponses[code] = filteredStateMedia;
    }
    error = chooseDeepestMissingParam(stateMedia.errors, error);
  }
  if (Object.keys(relevantResponses).length > 0) {
    return { responses: relevantResponses };
  }
  return {
    error: error === undefined ? undefined : error.msg,
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
