import { Backend, IListener } from "unmock-core";
import {
  IInterceptorFactory,
  IInterceptorOptions,
} from "unmock-core/dist/interceptor";
import { FetchInterceptorWrapper } from "./fetch-interceptor";

const interceptorFactory: IInterceptorFactory = (opts: IInterceptorOptions) => {
  return new FetchInterceptorWrapper(opts);
};

/**
 * Browser backend.
 */
export default class BrowserBackend extends Backend {
  public constructor() {
    const listeners: IListener[] = [];
    super({
      interceptorFactory,
      listeners,
    });
  }
}
