import { spy as sinonSpy } from "sinon";
import { ISerializedRequest, ISerializedResponse } from "../../interfaces";
import decorateSpy from "./decorate";
import { ICallTracker, ServiceSpy } from "./types";

/**
 * Container for tracking spy calls via `track` method,
 * calls are exposed via `spy` property.
 */
class CallTracker {
  /**
   * Build a spy for a response generator function, decorated with our helpers
   * @param gen Response generator
   */
  private static buildSpy(
    gen: (req: ISerializedRequest) => ISerializedResponse
  ) {
    const bareSpy = sinonSpy(gen);
    return decorateSpy(bareSpy);
  }
  public readonly spy: ServiceSpy;
  private returnValue?: ISerializedResponse;

  constructor() {
    this.spy = CallTracker.buildSpy(this.spyFn.bind(this));
  }

  public track({
    req,
    res
  }: {
    req: ISerializedRequest;
    res: ISerializedResponse;
  }): void {
    // Hack to predefine what the spied function should return
    this.returnValue = res;
    this.spy(req);
    this.returnValue = undefined;
  }

  public reset(): void {
    this.spy.resetHistory();
  }

  private spyFn(_: ISerializedRequest): ISerializedResponse {
    if (typeof this.returnValue === "undefined") {
      throw Error("Undefined return value");
    }
    return this.returnValue;
  }
}

export * from "./types";
export const createCallTracker = (): ICallTracker => new CallTracker();
