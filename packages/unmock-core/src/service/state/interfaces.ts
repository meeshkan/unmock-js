import { HTTPMethod, IStateInput, Operation, Paths } from "../interfaces";

export interface IStateUpdate {
  stateInput: IStateInput;
  serviceName: string;
  paths: Paths;
  /**
   * Complements the endpoint given in IStateInput, by redirecting to the correct endpoint in Schema.
   * This happens when an endpoint consists of variables, for example.
   */
  schemaEndpoint: string;
}
export interface IOperationForStateUpdate {
  endpoint: string;
  method: HTTPMethod;
  operation: Operation;
}
export type OperationsForStateUpdate = IOperationForStateUpdate[];
