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

interface IValidState {
  responses?: codeToMedia;
  error?: IMissingParam;
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

/**
 * Given a response, state and code, attempts to fetch the copied, spread state that matches the different
 * content types in `response`.
 * @param response
 * @param state
 * @param code
 */
const validStatesForStateWithCode = (
  response: Reference | Response | undefined,
  state: IStateInputGenerator,
  code: number | string,
): IValidState => {
  if (
    response === undefined ||
    isReference(response) ||
    response.content === undefined
  ) {
    return {
      error: {
        msg: `Can't find response for given status code '${code}'!`,
        nestedLevel: -1,
      },
    };
  }
  const stateMedia = getStateFromMedia(response.content, state);
  const error = chooseDeepestMissingParam(stateMedia.errors);
  return {
    responses: { [code]: stateMedia.responses },
    error,
  };
};

/**
 * Given responses and a state, attempts to fetch the copied spread states that matches the different
 * response codes and content types in `responses`.
 * @param operationResponses
 * @param state
 */
const validStatesForStateWithoutCode = (
  operationResponses: Responses,
  state: IStateInputGenerator,
): IValidState => {
  const relevantResponses: codeToMedia = {};
  let err: IMissingParam | undefined;

  for (const code of Object.keys(operationResponses)) {
    const { responses, error } = validStatesForStateWithCode(
      operationResponses[code as codeType],
      state,
      code,
    );
    err = error === undefined ? err : chooseDeepestMissingParam([error], err);

    if (responses === undefined) {
      continue;
    }

    const resp = responses[code];
    const filteredStateMedia = Object.keys(resp).reduce(
      (acc: IResponsesFromContent, contentType: string) =>
        Object.keys(resp[contentType]).length > 0
          ? Object.assign(acc, { [contentType]: resp[contentType] })
          : acc,
      {},
    );

    if (Object.keys(filteredStateMedia).length > 0) {
      relevantResponses[code] = filteredStateMedia;
    }
  }

  return Object.keys(relevantResponses).length > 0
    ? { responses: relevantResponses }
    : { error: err };
};
/**
 * Given a state and an operation, creates a copy of the requested state for each response that it matches.
 * First-level filtering is done via $code (status code) if it exists,
 * otherwise via matching the parameters set in `state`.
 * @param operation
 * @param state
 */
export const getValidStatesForOperationWithState = (
  operation: Operation,
  state: IStateInputGenerator,
): {
  responses: codeToMedia | undefined;
  error: string | undefined;
} => {
  const resps = operation.responses;
  const code = state.top.$code;
  const { responses, error } =
    code !== undefined
      ? // If $code is defined, we fetch the response even if no other state was set
        validStatesForStateWithCode(
          resps[String(code) as codeType],
          state,
          code,
        )
      : // Otherwise, iterate over all status codes and find the ones matching the given state
        validStatesForStateWithoutCode(resps, state);
  return { responses, error: error === undefined ? error : error.msg };
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
