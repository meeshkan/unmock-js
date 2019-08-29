import { SinonSpy as SinonSpyType } from "sinon";
import { ISerializedRequest, ISerializedResponse } from "../../interfaces";
import { ISpyDecoration } from "./generated";

export type SinonSpy = SinonSpyType<[ISerializedRequest], ISerializedResponse>;

export type UnmockServiceSpy = SinonSpy & ISpyDecoration;

export interface IRequestResponsePair {
  req: ISerializedRequest;
  res: ISerializedResponse;
}

export interface ICallTracker {
  /**
   * Keep track of calls, added via the `notify` method
   */
  spy: UnmockServiceSpy;
  /**
   * Add new call to the spy object
   */
  track(pair: IRequestResponsePair): void;
  reset(): void;
}
