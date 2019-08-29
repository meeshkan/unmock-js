import { SinonSpy as SinonSpyType } from "sinon";
import { ISerializedRequest, ISerializedResponse } from "../../interfaces";
import { ISpyDecoration } from "./generated";

export type SinonSpy = SinonSpyType<[ISerializedRequest], ISerializedResponse>;

export interface ServiceSpy extends SinonSpy, ISpyDecoration {} // tslint:disable-line:interface-name

export interface IRequestResponsePair {
  req: ISerializedRequest;
  res: ISerializedResponse;
}

export interface ICallTracker {
  /**
   * Keep track of calls, added via the `notify` method
   */
  spy: ServiceSpy;
  /**
   * Add new call to the spy object
   */
  track(pair: IRequestResponsePair): void;
  reset(): void;
}
