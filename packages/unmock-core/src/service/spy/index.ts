import { SinonSpy, spy as sinonSpy } from "sinon";
import { ISerializedRequest, ISerializedResponse } from "../../interfaces";
import { IService } from "../interfaces";

export type RequestResponseSpy = SinonSpy<
  [ISerializedRequest],
  ISerializedResponse
>;

interface IRequestResponsePair {
  req: ISerializedRequest;
  res: ISerializedResponse;
}

export interface IRecorder {
  /**
   * Keep track of calls, added via the `notify` method
   */
  spy: RequestResponseSpy;
  /**
   * Add new call to the spy object
   */
  record(pair: IRequestResponsePair): void;
  reset(): void;
}

export type RequestResponseSpyNotifier = CallRecorder<
  ISerializedRequest,
  ISerializedResponse
>;

/**
 * Helper class whose `notify(arg, ret)` calls `record` with argument `arg`
 * with predefined response `ret`. This is useful when you want to "spy" on `record`
 * with predefined request-response pairs.
 */
export class RecorderHelper<TArg = any, TReturnValue = any> {
  private returnValue?: TReturnValue;

  public notify(targs: TArg, tret: TReturnValue) {
    // Ugly hack to predefine what the spied function should return
    this.returnValue = tret;
    this.record(targs);
    this.returnValue = undefined;
  }

  public record(_: TArg): TReturnValue {
    return this.returnValue!;
  }
}

/**
 * Container for adding spy calls with `notify` method.
 */
class CallRecorder<TArg = any, TReturnValue = any> {
  // tslint:disable-line
  public readonly record: ({
    req,
    res,
  }: {
    req: TArg;
    res: TReturnValue;
  }) => void;
  public readonly reset: () => void;
  public readonly spy: SinonSpy<[TArg], TReturnValue>;
  private readonly recorderHelper: RecorderHelper<TArg, TReturnValue>;
  constructor() {
    this.recorderHelper = new RecorderHelper<TArg, TReturnValue>();
    this.spy = sinonSpy(this.recorderHelper, "record");
    this.record = ({ req, res }: { req: TArg; res: TReturnValue }) => {
      this.recorderHelper.notify(req, res);
    };
    this.reset = () => {
      this.spy.resetHistory();
    };
  }
}

export const createCallRecorder = (): IRecorder =>
  new CallRecorder<ISerializedRequest, ISerializedResponse>();

export const attachToService = (service: IService): IService & IRecorder => {
  const spyable = createCallRecorder();
  return Object.assign(service, spyable);
};
/*
export interface Service {
  spy: Spy;
  state: State;
  generate(req: Request): Response;
}
 */

/* type ServiceCore = {
  generate(sreq: ISerializedRequest): ISerializedResponse;
};

export type Service = ServiceCore & Pick<ISpyable, "spy" | "reset">;
 */
