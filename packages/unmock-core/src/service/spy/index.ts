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

export class NotifiableSpyable<TArg = any, TReturnValue = any> {
  private returnValue?: TReturnValue;

  public notify(targs: TArg, tret: TReturnValue) {
    // Ugly hack to predefine what the spied function should return
    this.returnValue = tret;
    this.spiedFn(targs);
    this.returnValue = undefined;
  }

  public spiedFn(_: TArg): TReturnValue {
    return this.returnValue!;
  }
}

/**
 * Container for adding spy calls with `notify` method.
 */

class SpyContainer<TArg = any, TReturnValue = any> {
  // tslint:disable-line
  public readonly notify: (targ: TArg, tret: TReturnValue) => void;
  public readonly reset: () => void;
  public readonly spy: SinonSpy<[TArg], TReturnValue>;
  private readonly notifiableSpyable: NotifiableSpyable<TArg, TReturnValue>;
  constructor() {
    this.notifiableSpyable = new NotifiableSpyable<TArg, TReturnValue>();
    this.spy = sinonSpy(this.notifiableSpyable, "spiedFn");
    this.notify = (targ: TArg, tret: TReturnValue) => {
      this.notifiableSpyable.notify(targ, tret);
    };
    this.reset = () => {
      this.spy.resetHistory();
    };
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
