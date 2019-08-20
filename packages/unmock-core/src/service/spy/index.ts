import { SinonSpy as SinonSpyType, spy as sinonSpy } from "sinon";
import { ISerializedRequest, ISerializedResponse } from "../../interfaces";

export type RequestResponseSpy = SinonSpyType<
  [ISerializedRequest],
  ISerializedResponse
>;

export interface IRequestResponsePair {
  req: ISerializedRequest;
  res: ISerializedResponse;
}

export interface ICallTracker {
  /**
   * Keep track of calls, added via the `notify` method
   */
  spy: RequestResponseSpy;
  /**
   * Add new call to the spy object
   */
  track(pair: IRequestResponsePair): void;
  reset(): void;
}

/**
 * Container for tracking spy calls via `track` method,
 * calls are exposed via `spy` property.
 */
class CallTracker<TArg = any, TReturnValue = any> {
  // tslint:disable-line:max-classes-per-file
  public readonly spy: SinonSpyType<[TArg], TReturnValue>;
  private returnValue?: TReturnValue;
  constructor() {
    this.spy = sinonSpy(this.spyFn.bind(this));
  }

  public track({ req, res }: { req: TArg; res: TReturnValue }): void {
    // Hack to predefine what the spied function should return
    this.returnValue = res;
    this.spy(req);
    this.returnValue = undefined;
  }

  public reset(): void {
    this.spy.resetHistory();
  }

  private spyFn(_: TArg): TReturnValue {
    if (typeof this.returnValue === "undefined") {
      throw Error("Undefined return value");
    }
    return this.returnValue;
  }
}

export const createCallTracker = (): ICallTracker =>
  new CallTracker<ISerializedRequest, ISerializedResponse>();
