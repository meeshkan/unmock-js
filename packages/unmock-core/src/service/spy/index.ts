import { SinonSpy, spy as sinonSpy } from "sinon";
import { ISerializedRequest, ISerializedResponse } from "../../interfaces";

export type RequestResponseSpy = SinonSpy<
  [ISerializedRequest],
  ISerializedResponse
>;

interface IRequestResponsePair {
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

export type RequestResponseSpyNotifier = CallTracker<
  ISerializedRequest,
  ISerializedResponse
>;

/**
 * Helper class whose `notify(arg, ret)` calls `track` with argument `arg`
 * with predefined response `ret`. This is useful when you want to "spy" on `track`
 * with predefined request-response pairs.
 */
export class SpyHelper<TArg = any, TReturnValue = any> {
  private returnValue?: TReturnValue;

  public notify(targs: TArg, tret: TReturnValue) {
    // Ugly hack to predefine what the spied function should return
    this.returnValue = tret;
    this.track(targs);
    this.returnValue = undefined;
  }

  public track(_: TArg): TReturnValue {
    return this.returnValue!;
  }
}

/**
 * Container for tracking spy calls via `track` method,
 * calls are exposed via `spy` property.
 */
class CallTracker<TArg = any, TReturnValue = any> {
  // tslint:disable-line:max-classes-per-file
  public readonly spy: SinonSpy<[TArg], TReturnValue>;
  private readonly recorderHelper: SpyHelper<TArg, TReturnValue>;
  constructor() {
    this.recorderHelper = new SpyHelper<TArg, TReturnValue>();
    this.spy = sinonSpy(this.recorderHelper, "track");
  }

  public track({ req, res }: { req: TArg; res: TReturnValue }): void {
    this.recorderHelper.notify(req, res);
  }

  public reset(): void {
    this.spy.resetHistory();
  }
}

export const createCallRecorder = (): ICallTracker =>
  new CallTracker<ISerializedRequest, ISerializedResponse>();
