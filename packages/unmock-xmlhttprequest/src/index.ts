import {
  CreateResponse,
  OnSerializedRequest,
} from "unmock-core/dist/interfaces";
import replaceOpenAndReturnOriginal from "./xmlhttprequest";
export { replaceOpenAndReturnOriginal };

let xmlhttprequestInterceptor: XMLHttpRequestInterceptor | undefined;

export class XMLHttpRequestInterceptor {
  private originalXMLHttpRequestOpen: (
    method: string,
    url: string,
    async?: boolean,
    username?: string | null,
    password?: string | null,
  ) => void;
  constructor(onSerializedRequest: CreateResponse | OnSerializedRequest) {
    this.originalXMLHttpRequestOpen = replaceOpenAndReturnOriginal(
      onSerializedRequest,
    );
  }

  public disable() {
    if (this.originalXMLHttpRequestOpen) {
      XMLHttpRequest.prototype.open = this.originalXMLHttpRequestOpen;
    }
  }
}

export default {
  /**
   * Start intercepting `xmlhttprequest` requests by overriding
   * global.xmlhttprequest and/or window.xmlhttprequest.
   * @param onSerializedRequest Optional "algorithm" for determining the fake response
   */
  on(onSerializedRequest: CreateResponse | OnSerializedRequest) {
    this.off();
    xmlhttprequestInterceptor = new XMLHttpRequestInterceptor(
      onSerializedRequest,
    );
    return xmlhttprequestInterceptor;
  },

  /**
   * Stop intercepting `xmlhttprequest`, restore original `xmlhttprequest`.
   */
  off() {
    if (xmlhttprequestInterceptor) {
      xmlhttprequestInterceptor.disable();
      xmlhttprequestInterceptor = undefined;
    }
  },
};
