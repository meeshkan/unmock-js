import debug from "debug";
import minimatch from "minimatch";
import { DEFAULT_STATE_HTTP_METHOD } from "../constants";
import { DSL } from "../dsl";
import {
  codeToMedia,
  ExtendedHTTPMethod,
  HTTPMethod,
  Operation,
} from "../interfaces";
import { IStateUpdate, IValidationError } from "./interfaces";
import {
  chooseBestMatchingError,
  filterStatesByOperation,
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
    const { stateInput } = stateUpdate;
    const { endpoint, method, newState } = stateInput;
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

    let error: IValidationError | undefined;
    let opsResult = false;
    for (const op of ops.operations) {
      debugLog(`Testing against ${JSON.stringify(op.operation)}`);
      // For each operation, verify the new state applies and save in `this.state`
      const stateResponses = getValidStatesForOperationWithState(
        op.operation,
        newState,
        stateUpdate.dereferencer,
      );
      if (stateResponses.error !== undefined) {
        // failed path
        debugLog(
          `Couldn't match for ${op.operation.operationId} - received error ${stateResponses.error.msg}`,
        );
        error = chooseBestMatchingError(stateResponses.error, error);
        continue;
      }
      debugLog(`Matched successfully for ${JSON.stringify(op.operation)}`);
      const augmentedResponses = DSL.translateTopLevelToOAS(
        newState.top,
        stateResponses.responses,
      );
      this.updateStateInternal(endpoint, method, augmentedResponses);
      opsResult = true;
    }

    if (opsResult === false) {
      // all paths had an error - can't operate properly
      throw new Error(
        error
          ? error.msg
          : `Unexpected error while setting state - ${JSON.stringify(
              newState.state,
            )}`,
      );
    }
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
      })[0];
    if (mostRelevantEndpoint === undefined) {
      debugLog(`No states match '${endpoint}'`);
      return undefined;
    }

    debugLog(`Most relevant endpoint is ${mostRelevantEndpoint}`);

    // From the chosen endpoint, check if the given method exists, if not, choose the DEFAULT METHOD state.
    const relevantState =
      this.state[mostRelevantEndpoint][method] !== undefined
        ? this.state[mostRelevantEndpoint][method]
        : this.state[mostRelevantEndpoint][DEFAULT_STATE_HTTP_METHOD];

    // Filter all the states that do not match the operation schema
    // const filteredStates = filterStatesByOperation(states, operation);
    const { parsed, newState } = DSL.actTopLevelFromOAS(relevantState);
    console.log(newState, mostRelevantEndpoint);
    // TODO: After parsing, do we want to see if we need to remove items from the current state?
    return Object.keys(parsed).length > 0 ? parsed : undefined;
  }

  public reset() {
    this.state = {};
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
}
