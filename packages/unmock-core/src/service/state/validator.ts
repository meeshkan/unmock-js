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
import { IValidationError } from "./interfaces";
import { chooseErrorFromList } from "./utils";

const debugLog = debug("unmock:state:validator");

type codeType = keyof Responses;

interface IResponsesFromContent {
  [contentType: string]: Record<string, Schema> | Schema;
}

interface IValidState {
  responses?: codeToMedia;
  error?: IValidationError;
}

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
  error: IValidationError | undefined;
} => {
  debugLog(
    `getValidStatesForOperationWithState: Attempting to match and copy a ` +
      `partial state that matches ${JSON.stringify(
        state.state,
      )} from ${JSON.stringify(operation)}`,
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
  return { responses, error };
};

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

  const mapped = Object.keys(operationResponses).map(code => {
    debugLog(
      `validStatesForStateWithoutCode: Testing against status code ${code}`,
    );
    return {
      code,
      ...validStatesForStateWithCode(
        operationResponses[code as codeType],
        state,
        code,
        deref,
      ),
    };
  });

  const responses: codeToMedia = mapped
    .filter(o => o.error === undefined && o.responses !== undefined)
    .reduce((acc, o) => {
      const resp = (o.responses as codeToMedia)[o.code];
      const filtered = Object.keys(resp)
        .filter(contentType => Object.keys(resp[contentType]).length > 0)
        .reduce(
          (obj, contentType) => ({ ...obj, [contentType]: resp[contentType] }),
          {},
        );
      return {
        ...acc,
        ...(Object.keys(filtered).length > 0 ? { [o.code]: filtered } : {}),
      };
    }, {});

  const success = Object.keys(responses).length > 0;
  const error = success
    ? undefined
    : chooseErrorFromList(mapped.map(o => o.error));
  return success ? { responses } : { error };
};

const getStateFromMedia = (
  contentRecord: Record<string, MediaType>,
  state: IStateInputGenerator,
  deref: Dereferencer,
): {
  responses: IResponsesFromContent;
  error?: IValidationError;
} => {
  debugLog(
    `getStateFromMedia: Attempting to copy a partial state for ${state} from given media types ${contentRecord}`,
  );
  const mapped = Object.keys(contentRecord).map(mediaType => {
    const content = contentRecord[mediaType];
    if (content === undefined || content.schema === undefined) {
      debugLog(`getStateFromMedia: No schema defined in ${mediaType}`);
      return {
        mediaType,
        error: {
          msg: `No schema defined in '${JSON.stringify(content)}'!`,
          nestedLevel: -1,
        },
      };
    }
    const { spreadState, error } = state.gen(deref<Schema>(content.schema));
    debugLog(
      `getStateFromMedia: Spread state for ${mediaType} ${
        error !== undefined ? "has errors" : "is valid"
      }`,
    );
    return error !== undefined
      ? { mediaType, error: { msg: error, nestedLevel: 0 } }
      : { mediaType, spreadState };
  });

  const responses: IResponsesFromContent = mapped
    .filter(obj => obj.spreadState !== undefined)
    .reduce(
      (acc, obj) => ({
        ...acc,
        [obj.mediaType]: obj.spreadState,
      }),
      {},
    );
  const success = Object.keys(responses).length > 0;
  return {
    responses,
    error: success
      ? undefined
      : chooseErrorFromList(mapped.map(obj => obj.error)),
  };
};
