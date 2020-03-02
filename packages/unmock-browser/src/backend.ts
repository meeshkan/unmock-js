import { Backend, IListener } from "unmock-core";
import {
  IInterceptorFactory,
  IInterceptorOptions,
} from "unmock-core/dist/interceptor";
import { BrowserInterecptor } from "./browser-interceptor";

const interceptorFactory: IInterceptorFactory = (opts: IInterceptorOptions) => {
  return new BrowserInterecptor(opts);
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
