import { IInterceptorOptions } from "unmock-core/dist/interceptor";
import XMLHttpRequestInterceptor from "unmock-xmlhttprequest";

export class XMLHttpRequestInterceptorWrapper {
  private readonly config: IInterceptorOptions;
  constructor(options: IInterceptorOptions) {
    this.config = options;
    // TODO Respect shouldBypassHost
    XMLHttpRequestInterceptor.on(this.config.onSerializedRequest);
  }

  public disable() {
    XMLHttpRequestInterceptor.off();
  }
}
