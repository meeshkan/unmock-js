import { Backend, IListener } from "unmock-core";
import {
  IInterceptorFactory,
  IInterceptorOptions,
} from "unmock-core/dist/interceptor";
import { FetchInterceptor } from "./fetch-interceptor";

const interceptorFactory: IInterceptorFactory = (opts: IInterceptorOptions) => {
  return new FetchInterceptor(opts);
};

/**
 * React Native backend.
 */
export default class ReactNativeBackend extends Backend {
  public constructor() {
    const listeners: IListener[] = [];
    super({
      interceptorFactory,
      listeners,
    });
  }

  public loadServices() {} // tslint:disable-line:no-empty
}
