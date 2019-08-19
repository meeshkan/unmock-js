import { SinonSpy, spy as sinonSpy } from "sinon";
import { ISerializedRequest, ISerializedResponse } from "../../interfaces";
import { IService } from "../interfaces";

export type RequestResponseSpy = SinonSpy<
  [ISerializedRequest],
  ISerializedResponse
>;

export interface ISpyable {
  /**
   * Keep track of calls, added via the `notify` method
   */
  spy: RequestResponseSpy;
  /**
   * Add new call to the spy object
   * @param req Request
   * @param res Response
   */
  notify(req: ISerializedRequest, res: ISerializedResponse): void;
  reset(): void;
}

export type RequestResponseSpyNotifier = SpyContainer<
  ISerializedRequest,
  ISerializedResponse
>;

/**
 * Container for adding spy calls with `notify` method.
 */
class SpyContainer<TArg = any, TReturnValue = any> {
  public readonly spy: SinonSpy<[TArg], TReturnValue>;
  private returnValue?: TReturnValue;
  constructor() {
    // @ts-ignore
    this.spy = sinonSpy(this, "spiedFn");
  }

  public notify(targs: TArg, tret: TReturnValue) {
    // Ugly hack to predefine what the spied function should return
    this.returnValue = tret;
    this.spiedFn(targs);
    this.returnValue = undefined;
  }

  public reset(): void {
    this.spy.resetHistory();
  }

  private spiedFn(_: TArg): TReturnValue {
    return this.returnValue!;
  }
}

export const createRequestResponseSpy = (): ISpyable =>
  new SpyContainer<ISerializedRequest, ISerializedResponse>();

export const attach = (service: IService): IService & ISpyable => {
  const spyable = new SpyContainer();
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
