import {
  CreateResponse,
  ISerializedRequest,
  ISerializedResponse,
  OnSerializedRequest,
} from "unmock-core/dist/interfaces";
import buildFetch from "./fetch";
export { buildFetch };

// export type CreateResponse = (req: ISerializedRequest) => ISerializedResponse;

export type Listener = (
  req: ISerializedRequest,
  respond: (res: ISerializedResponse) => void,
) => void;

export type Fetch = (url: RequestInfo, init?: RequestInit) => Promise<Response>;

// tslint:disable-next-line:no-namespace
declare namespace global {
  let fetch: Fetch;
}

// tslint:disable-next-line:no-namespace
declare namespace window {
  let fetch: Fetch;
}

let fetchInterceptor: FetchInterceptor | undefined;

/**
 * Fill global `fetch` object with mock fetch.
 */
export class FetchInterceptor {
  public readonly fetch: Fetch;
  private originalFetch?: { where: any; fetch: any };
  constructor(onSerializedRequest: CreateResponse | OnSerializedRequest) {
    this.fetch = buildFetch(onSerializedRequest);
    if (typeof global !== "undefined") {
      this.originalFetch = {
        where: global,
        fetch: global.fetch,
      };
      global.fetch = this.fetch;
    } else if (typeof window !== "undefined") {
      this.originalFetch = { where: window, fetch: window.fetch };
      window.fetch = this.fetch;
    }
  }

  public disable() {
    if (this.originalFetch) {
      this.originalFetch.where.fetch = this.originalFetch.fetch;
      this.originalFetch = undefined;
    }
  }
}

export default {
  /**
   * Start intercepting `fetch` requests by overriding
   * global.fetch and/or window.fetch.
   * @param onSerializedRequest Optional "algorithm" for determining the fake response
   */
  on(onSerializedRequest: CreateResponse | OnSerializedRequest) {
    this.off();
    fetchInterceptor = new FetchInterceptor(onSerializedRequest);
    return fetchInterceptor;
  },

  /**
   * Stop intercepting `fetch`, restore original `fetch`.
   */
  off() {
    if (fetchInterceptor) {
      fetchInterceptor.disable();
      fetchInterceptor = undefined;
    }
  },
};
