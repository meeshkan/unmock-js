import debug from "debug";
import {
  ExtendedHTTPMethod,
  IResponsesFromOperation,
  Schema,
} from "../interfaces";
import { IOperationForStateUpdate, IStateUpdate } from "./interfaces";
import { getOperations } from "./utils";
import { getValidResponsesForOperationWithState } from "./validator";

type mediaTypeToSchema = Record<string, Schema>;
type statusToMediaType = Record<string, mediaTypeToSchema>;
//                              path           method       status
type ServiceStateType = Record<string, Record<string, statusToMediaType>>;

const debugLog = debug("unmock:state");

/**
 * Maintains a state for service
 */
export class State {
  private state: ServiceStateType = {};

  public update(stateUpdate: IStateUpdate) {
    const { stateInput } = stateUpdate;
    const { endpoint, method, newState } = stateInput;
    debugLog(`Fetching operations for '${method} ${endpoint}'...`);
    const ops = getOperations(stateUpdate);
    if (ops.error !== undefined) {
      debugLog(`Couldn't find any matching operations: ${ops.error}`);
      return ops.error;
    }
    if (newState === undefined) {
      // No state given, no changes to make
      return;
    }
    debugLog(`Found follow operations: ${ops.operations}`);

    const opsResult = ops.operations.reduce(
      (
        { nErrors, lastError }: { nErrors: number; lastError?: string },
        op: IOperationForStateUpdate,
      ) => {
        // For each operation, verify the new state applies and save in `this.state`
        const stateResponses = getValidResponsesForOperationWithState(
          op.operation,
          newState,
        );
        if (stateResponses.error === undefined) {
          debugLog(`Matched successfully for ${op.operation.operationId}`);
          this.updateStateInternal(endpoint, method, stateResponses.responses);
          return { nErrors, lastError };
        }
        // failed path
        debugLog(
          `Couldn't match for ${op.operation.operationId} - received error ${stateResponses.error}`,
        );
        return { nErrors: nErrors + 1, lastError: stateResponses.error };
      },
      { nErrors: 0, lastError: undefined },
    );

    if (opsResult.nErrors === ops.operations.length) {
      // all paths had an error - can't operate properly
      throw new Error(opsResult.lastError);
    }
    return;
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
