import debug from "debug";
import minimatch from "minimatch";
import { DEFAULT_STATE_HTTP_METHOD } from "../constants";
import {
  ExtendedHTTPMethod,
  HTTPMethod,
  IResponsesFromOperation,
  Operation,
} from "../interfaces";
import {
  codeToMedia,
  IOperationForStateUpdate,
  IStateUpdate,
} from "./interfaces";
import { filterStatesByOperation, getOperations } from "./utils";
import { getValidResponsesForOperationWithState } from "./validator";

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
    const { stateInput } = stateUpdate;
    const { endpoint, method, newState } = stateInput;
    debugLog(`Fetching operations for '${method} ${endpoint}'...`);
    const ops = getOperations(stateUpdate);
    if (ops.error !== undefined) {
      debugLog(`Couldn't find any matching operations: ${ops.error}`);
      return ops.error;
    }
    if (newState === undefined || Object.keys(newState).length === 0) {
      // No state given, no changes to make
      return;
    }
    debugLog(`Found follow operations: ${ops.operations}`);

    let errorMsg: string | undefined;
    const opsResult = ops.operations.some((op: IOperationForStateUpdate) => {
      // For each operation, verify the new state applies and save in `this.state`
      const stateResponses = getValidResponsesForOperationWithState(
        op.operation,
        newState,
      );
      if (stateResponses.error === undefined) {
        debugLog(`Matched successfully for ${op.operation.operationId}`);
        this.updateStateInternal(endpoint, method, stateResponses.responses);
        return true;
      }
      // failed path
      debugLog(
        `Couldn't match for ${op.operation.operationId} - received error ${stateResponses.error}`,
      );
      errorMsg = stateResponses.error;
      return false;
    });

    if (opsResult === false) {
      // all paths had an error - can't operate properly
      return errorMsg;
    }
    return;
  }

  /**
   * Returns the state for given combination of method and endpoint.
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
    operation: Operation,
  ): codeToMedia | undefined {
    debugLog(`Filtering all saved states that match '${endpoint}'...`);

    const matchingEndpointKeys = Object.keys(this.state).filter(
      (sKey: string) => minimatch(endpoint, sKey, { nocase: true }),
    );
    if (matchingEndpointKeys.length === 0) {
      debugLog(`No states match '${endpoint}'`);
      return undefined;
    }
    // sort endpoints by location of asterisks and frequency
    // (done to spread and overwrite as needed). Results is e.g:
    // (**, /stores/*/petId/*, /stores/*/petId/404, /stores/myStore/petId/*, /stores/foo/petId/200)
    matchingEndpointKeys.sort((a: string, b: string) => {
      const nA = a.split("*");
      const nB = b.split("*");
      return nA > nB || (nA === nB && a.indexOf("*") < b.indexOf("*")) ? 1 : -1;
    });

    debugLog(
      `Found following endpoints as matches for '${matchingEndpointKeys}: ${JSON.stringify(
        matchingEndpointKeys,
      )}`,
    );

    // get all states that match the method, from the above endpoints
    const states = matchingEndpointKeys
      .filter((key: string) => this.state[key][method] !== undefined)
      .map((key: string) => this.state[key][method]);
    // Also include all the matching endpoint with DEFAULT_STATE_HTTP_METHOD:
    const expandedStates = states.concat(
      matchingEndpointKeys
        .filter(
          (key: string) =>
            this.state[key][DEFAULT_STATE_HTTP_METHOD] !== undefined,
        )
        .map((key: string) => this.state[key][DEFAULT_STATE_HTTP_METHOD]),
    );

    // Filter all the states that do not match the operation schema
    return filterStatesByOperation(expandedStates, operation);
  }

  private updateStateInternal(
    endpoint: string,
    method: ExtendedHTTPMethod,
    responses?: IResponsesFromOperation,
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
}
