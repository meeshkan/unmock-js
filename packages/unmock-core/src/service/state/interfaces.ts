import { HTTPMethod, IStateInput, Operation, Paths } from "../interfaces";
import { OASMatcher } from "../matcher";

export interface IStateUpdate {
  stateInput: IStateInput;
  serviceName: string;
  paths: Paths;
  matcher: OASMatcher;
}
export interface IOperationForStateUpdate {
  endpoint: string;
  method: HTTPMethod;
  operation: Operation;
}
export type OperationsForStateUpdate = IOperationForStateUpdate[];
