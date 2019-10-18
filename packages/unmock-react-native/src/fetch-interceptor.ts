import { IInterceptorOptions } from "unmock-core/dist/interceptor";
import FetchMitm from "unmock-fetch";

export class FetchInterceptor {
  private readonly config: IInterceptorOptions;
  constructor(options: IInterceptorOptions) {
    this.config = options;
    // TODO Respect shouldBypassHost
    FetchMitm.on(this.config.onSerializedRequest);
  }

  public disable() {
    FetchMitm.off();
  }
}
