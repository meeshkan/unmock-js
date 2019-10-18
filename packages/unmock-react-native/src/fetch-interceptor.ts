import { IInterceptorOptions } from "unmock-core/dist/interceptor";
import FetchInterceptor from "unmock-fetch";

export class FetchInterceptorWrapper {
  private readonly config: IInterceptorOptions;
  constructor(options: IInterceptorOptions) {
    this.config = options;
    // TODO Respect shouldBypassHost
    FetchInterceptor.on(this.config.onSerializedRequest);
  }

  public disable() {
    FetchInterceptor.off();
  }
}
