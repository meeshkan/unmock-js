import { Backend, IListener } from "unmock-core";
import { FetchInterceptor } from "./fetch-interceptor";

/**
 * React Native backend.
 */
export default class ReactNativeBackend extends Backend {
  public constructor() {
    const listeners: IListener[] = [];
    super({
      InterceptorCls: FetchInterceptor,
      listeners,
    });
  }

  public loadServices() {} // tslint:disable-line:no-empty
}
