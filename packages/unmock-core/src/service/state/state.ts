import debug from "debug";
import minimatch from "minimatch";
import { HTTPMethod } from "../../interfaces";
import { DEFAULT_STATE_HTTP_METHOD } from "../constants";
import { DSL } from "../dsl";
import { codeToMedia, ExtendedHTTPMethod } from "../interfaces";
import { IStateUpdate } from "./interfaces";
import {
  chooseErrorFromList,
  convertEndpointToWildcard,
  getOperations,
} from "./utils";
import { getValidStatesForOperationWithState } from "./validator";

const debugLog = debug("unmock:state");

//                              path           method       status
type ServiceStateType = Record<string, Record<string, codeToMedia>>;

/**
 * Maintains a state for service
 */
export class State {
  private state: ServiceStateType = {};

  /***
   * Updates the current state, validating the input as needed.
   * @param stateUpdate - contains the `IStateUpdate` object, which is
   * the defacto update requested, and `schemaEndpoint`, `paths` and `serviceName`.
   * The latter is used for error messages only.
   * `schemaEndpoint` is a mapping from the actual requested `endpoint` to the one in `paths`,
   * and the result is used to verify the contents of `stateInput`.
   */
  public update(stateUpdate: IStateUpdate) {
    const { endpoint, method, newState } = stateUpdate.stateInput;
    debugLog(`Fetching operations for '${method} ${endpoint}'...`);
    const ops = getOperations(stateUpdate);
    if (ops.error !== undefined) {
      debugLog(`Couldn't find any matching operations: ${ops.error}`);
      throw new Error(ops.error);
    }
    if (newState.isEmpty) {
      // No state given, no changes to make
      return;
    }
    debugLog(
      `Found the following operations: ${JSON.stringify(
        ops.operations,
        undefined,
        1,
      )}`,
    );

    const mapped = ops.operations.map(op => ({
      ...getValidStatesForOperationWithState(
        op.operation,
        newState,
        stateUpdate.dereferencer,
      ),
      endpoint: op.endpoint,
      method: op.method,
    }));

    const failed = mapped.every(resp => resp.error !== undefined);
    if (failed) {
      const error = chooseErrorFromList(mapped.map(resp => resp.error));
      throw new Error(
        error
          ? error.msg
          : `Unexpected error while setting state - ${JSON.stringify(
              newState.state,
            )}`,
      );
    }

    mapped
      .filter(resp => resp.error === undefined)
      .map(resp => ({
        state: DSL.translateTopLevelToOAS(newState.top, resp.responses),
        endpoint: convertEndpointToWildcard(resp.endpoint),
        method: resp.method,
      }))
      .forEach(aug =>
        this.updateStateInternal(aug.endpoint, aug.method, aug.state),
      );
  }

  /**
   * Returns the state for given combination of method and endpoint. Might update state according to DSL.
   * At this point, method is expected to be a valid HTTP method, and endpoint is expected
   * to be specific endpoint.
   * @param method
   * @param endpoint
   * @returns Depending on matching results, one of the following:
   *          1. undefined if no state was defined for the endpoint + method
   *          2. Record<string, Record<string, Schema>>[] where the first level has status codes as key,
   *             and second level has MediaType as key (e.g. "application/json").
   *             Each of the array items matches the endpoint and method, and has to be filtered according to the schema
   *             the true endpoint really has.
   */
  public getState(
    method: HTTPMethod,
    endpoint: string,
  ): codeToMedia | undefined {
    debugLog(`Filtering all saved states that match '${endpoint}'...`);

    const mostRelevantEndpoint = Object.keys(this.state)
      .filter(
        (sKey: string) =>
          minimatch(endpoint, sKey, { nocase: true }) &&
          (this.state[sKey][method] !== undefined ||
            this.state[sKey][DEFAULT_STATE_HTTP_METHOD] !== undefined),
      )
      .sort((a: string, b: string) => {
        // sort endpoints by location of asterisks and frequency
        // (done to choose most relevant endpoint with state). Results is e.g:
        // (**, /stores/*/petId/*, /stores/*/petId/404, /stores/myStore/petId/*, /stores/foo/petId/200)
        const nA = a.split("*");
        const nB = b.split("*");
        return nA > nB || (nA === nB && a.indexOf("*") < b.indexOf("*"))
          ? -1
          : 1;
      })
      .shift();

    if (mostRelevantEndpoint === undefined) {
      debugLog(`No states match '${endpoint}'`);
      return undefined;
    }

    debugLog(`Most relevant endpoint is ${mostRelevantEndpoint}`);

    // From the chosen endpoint, check if the given method exists, if not, choose the DEFAULT METHOD state.
    const matchingMethod = Object.keys(
      this.state[mostRelevantEndpoint],
    ).includes(method)
      ? method
      : DEFAULT_STATE_HTTP_METHOD;
    const relevantState = this.state[mostRelevantEndpoint][matchingMethod];

    const { parsed, newState } = DSL.actTopLevelFromOAS(relevantState);
    // Update state if needed
    this.updateStateFromDSL(newState, mostRelevantEndpoint, matchingMethod);
    return Object.keys(parsed).length > 0 ? parsed : undefined;
  }

  public reset() {
    this.state = {};
  }

  private updateStateFromDSL(
    newState: codeToMedia,
    endpoint: string,
    method: ExtendedHTTPMethod,
  ) {
    Object.keys(newState).forEach(code =>
      Object.keys(newState[code]).forEach(media => {
        const state = newState[code][media];
        if (state === undefined) {
          // Marked for deletion
          this.deleteStateInternal(endpoint, method, code, media);
        } else if (Object.keys(state).length > 0) {
          // new state available
          this.updateStateInternal(endpoint, method, {
            [code]: { [media]: state },
          });
        }
      }),
    );
  }

  private updateStateInternal(
    endpoint: string,
    method: ExtendedHTTPMethod,
    responses?: codeToMedia,
  ) {
    if (this.state[endpoint] === undefined) {
      this.state[endpoint] = {};
    }
    if (this.state[endpoint][method] === undefined) {
      this.state[endpoint][method] = {};
    }
    this.state[endpoint][method] = {
      ...this.state[endpoint][method],
      ...responses,
    };
  }

  private deleteStateInternal(
    endpoint: string,
    method: ExtendedHTTPMethod,
    code: string,
    mediaType: string,
  ) {
    if (
      this.state[endpoint] === undefined ||
      this.state[endpoint][method] === undefined ||
      this.state[endpoint][method][code] === undefined ||
      this.state[endpoint][method][code][mediaType] === undefined
    ) {
      return;
    }

    delete this.state[endpoint][method][code][mediaType];
    if (Object.keys(this.state[endpoint][method][code]).length === 0) {
      delete this.state[endpoint][method][code];
      if (Object.keys(this.state[endpoint][method]).length === 0) {
        delete this.state[endpoint][method];
        if (Object.keys(this.state[endpoint]).length === 0) {
          delete this.state[endpoint];
        }
      }
    }
  }
}
