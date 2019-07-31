/**
 * Contains logic about validating a state request for a service.
 */

import debug from "debug";
import {
  codeToMedia,
  Dereferencer,
  IStateInputGenerator,
  MediaType,
  Operation,
  Reference,
  Response,
  Responses,
  Schema,
} from "../interfaces";
import { anyFn } from "./utils";

const debugLog = debug("unmock:state:validator");

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
  deref: Dereferencer,
): IValidState => {
  debugLog(
    `validStatesForStateWithCode: Looking to match ${JSON.stringify(
      state,
    )} with ${JSON.stringify(response)} for status code ${code}`,
  );
  const resolvedResponse = deref<Response | undefined>(response);
  if (
    resolvedResponse === undefined ||
    resolvedResponse.content === undefined
  ) {
    debugLog(`validStatesForStateWithCode: Given undefined response`);
    return {
      error: {
        msg: `Can't find response for given status code '${code}'!`,
        nestedLevel: -1,
      },
    };
  }
  const stateMedia = getStateFromMedia(resolvedResponse.content, state, deref);
  return {
    responses: { [code]: stateMedia.responses },
    error: stateMedia.error,
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
  deref: Dereferencer,
): IValidState => {
  debugLog(
    `validStatesForStateWithoutCode: Looking to match ${JSON.stringify(
      state,
    )} with ${JSON.stringify(operationResponses)}`,
  );
  const relevantResponses: codeToMedia = {};
  let err: IMissingParam | undefined;

  for (const code of Object.keys(operationResponses)) {
    debugLog(
      `validStatesForStateWithoutCode: Testing against status code ${code}`,
    );
    const { responses, error } = validStatesForStateWithCode(
      operationResponses[code as codeType],
      state,
      code,
      deref,
    );
    err = error === undefined ? err : chooseDeepestMissingParam([error], err);

    if (responses === undefined) {
      debugLog(
        `validStatesForStateWithoutCode: Could not find matching responses for ${code}`,
      );
      continue;
    }

    const resp = responses[code];
    debugLog(
      `validStatesForStateWithoutCode: No errors found for ${code}, filtering empty content`,
    );
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
  deref: Dereferencer,
): {
  responses: codeToMedia | undefined;
  error: string | undefined;
} => {
  debugLog(
    `getValidStatesForOperationWithState: Attempting to match and copy a ` +
      `partial state that matches ${state} from ${operation}`,
  );
  const resps = operation.responses;
  const code = state.top.$code;
  // If $code is defined, we fetch the response even if no other state was set
  // If $code is not found, use the default response - "the default MAY be used as a
  //    default response object for all HTTP codes that are not covered individually by the specification"
  // (see https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.0.md#responsesObject)
  const { responses, error } =
    code !== undefined
      ? validStatesForStateWithCode(
          resps[String(code) as codeType] || resps.default,
          state,
          code,
          deref,
        )
      : // Otherwise, iterate over all status codes and find the ones matching the given state
        validStatesForStateWithoutCode(resps, state, deref);
  return { responses, error: error === undefined ? error : error.msg };
};

const getStateFromMedia = (
  contentRecord: Record<string, MediaType>,
  state: IStateInputGenerator,
  deref: Dereferencer,
): {
  responses: IResponsesFromContent;
  error?: IMissingParam;
} => {
  debugLog(
    `getStateFromMedia: Attempting to copy a partial state for ${state} from given media types ${contentRecord}`,
  );
  const errors: IMissingParam[] = [];
  const relevantResponses: IResponsesFromContent = {};
  const success = anyFn(Object.keys(contentRecord), (contentType: string) => {
    const content = contentRecord[contentType];
    if (content === undefined || content.schema === undefined) {
      debugLog(`getStateFromMedia: No schema defined in ${contentType}`);
      errors.push({
        msg: `No schema defined in '${JSON.stringify(content)}'!`,
        nestedLevel: -1,
      });
      return false;
    }
    const spreadState = state.gen(deref<Schema>(content.schema));

    debugLog(
      `getStateFromMedia: Copied matching state, verifying all state elements exist (not null)`,
    );

    const missingParam = DFSVerifyNoneAreNull(spreadState);

    if (missingParam !== undefined) {
      debugLog(
        `getStateFromMedia: Some elements are missing in state, the spread state for ` +
          `${contentType} is invalid - ${spreadState}`,
      );
      errors.push(missingParam);
      return false;
    }
    debugLog(`getStateFromMedia: Spread state is valid for ${contentType}`);
    relevantResponses[contentType] = spreadState;
    return true;
  });
  return {
    responses: relevantResponses,
    error: success ? undefined : chooseDeepestMissingParam(errors),
  };
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
  if (obj === undefined) {
    return undefined;
  }
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
