import {
  ISerializedRequest,
  ISerializedResponse,
  OnSerializedRequest,
} from "unmock-core/dist/interfaces";
import buildFetch from "./fetch";
export { buildFetch };

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

let mitm: Mitm | undefined;

/**
 * Fill global `fetch` object with mock fetch.
 */
export class Mitm {
  public readonly fetch: Fetch;
  private originalFetch?: { where: any; fetch: any };
  constructor(onSerializedRequest: OnSerializedRequest) {
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
  on(onSerializedRequest: OnSerializedRequest) {
    this.off();
    mitm = new Mitm(onSerializedRequest);
    return mitm;
  },

  /**
   * Stop intercepting `fetch`, restore original `fetch`.
   */
  off() {
    if (mitm) {
      mitm.disable();
      mitm = undefined;
    }
  },
};
