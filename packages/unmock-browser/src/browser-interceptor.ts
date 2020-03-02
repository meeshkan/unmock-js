import { IInterceptorOptions } from "unmock-core/dist/interceptor";
import FetchInterceptor from "unmock-fetch";
import XMLHttpRequestInterecptor from "unmock-xmlhttprequest";

export class BrowserInterecptor {
  private readonly config: IInterceptorOptions;
  constructor(options: IInterceptorOptions) {
    this.config = options;
    // TODO Respect shouldBypassHost
    FetchInterceptor.on(this.config.onSerializedRequest);
    XMLHttpRequestInterecptor.on(this.config.onSerializedRequest);
  }

  public disable() {
    FetchInterceptor.off();
    XMLHttpRequestInterecptor.off();
  }
}
