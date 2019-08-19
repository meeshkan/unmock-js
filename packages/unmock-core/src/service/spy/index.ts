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
  // @ts-ignore
  public notify: (targ: TArg, tret: TReturnValue) => void;
  // @ts-ignore
  public reset: () => void;
  public readonly spy: SinonSpy<[TArg], TReturnValue>;
  private readonly notifyableSpyable: NotifiableSpyable<TArg, TReturnValue>;
  constructor() {
    // @ts-ignore
    this.notifyableSpyable = new NotifiableSpyable<TArg, TReturnValue>();
    this.spy = sinonSpy(this.notifyableSpyable, "spiedFn");
    Object.defineProperty(this, "notify", {
      value: (targ: TArg, tret: TReturnValue) => {
        this.notifyableSpyable.notify(targ, tret);
      },
      enumerable: true,
    });
    Object.defineProperty(this, "reset", {
      value: () => {
        return this.spy.resetHistory();
      },
      enumerable: true,
    });
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
