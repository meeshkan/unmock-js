import {
  Dereferencer,
  HTTPMethod,
  IStateInput,
  Operation,
  Paths,
} from "../interfaces";

export interface IStateUpdate {
  stateInput: IStateInput;
  paths: Paths;
  dereferencer: Dereferencer;
  serviceName: string;
  /**
   * Complements the endpoint given in IStateInput, by redirecting to the correct endpoint in Schema.
   * This happens when an endpoint consists of variables, for example.
   * Example: endpoint (in stateInput) is '/pets/5', schemaEndpoint is '/pets/{petId}'.
   */
  schemaEndpoint: string;
}
export interface IOperationForStateUpdate {
  endpoint: string;
  method: HTTPMethod;
  operation: Operation;
}
export type OperationsForStateUpdate = IOperationForStateUpdate[];
