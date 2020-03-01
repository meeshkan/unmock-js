import {
  CreateResponse,
  ISerializedResponse,
  OnSerializedRequest,
} from "unmock-core/dist/interfaces";
import serialize from "./serialize";

const XMLHttpRequestSetRequestHeader =
  XMLHttpRequest.prototype.setRequestHeader;

const isCreateResponse = (
  cb: CreateResponse | OnSerializedRequest,
): cb is CreateResponse => cb.length === 1; // Check the number of function arguments

export const replaceOpenAndReturnOriginal = (
  cb: CreateResponse | OnSerializedRequest,
) => {
  const XMLHttpRequestOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(
    method: string,
    url: string,
    async?: boolean,
    username?: string | null,
    password?: string | null,
  ): void {
    const headerz: { [name: string]: string } = {};
    this.setRequestHeader = function(name: string, value: string) {
      headerz[name] = value;
      return XMLHttpRequestSetRequestHeader.apply(this, [name, value]);
    };
    this.send = function(body?: Document | BodyInit | null): void {
      const request = serialize(url, method, headerz, body);
      const doResponseEnd = (rez: ISerializedResponse) => {
        Object.defineProperty(this, "getResponseHeader", {
          value: (key: string) => rez.headers[key],
          writable: false,
        });
        Object.defineProperty(this, "getResponseHeaders", {
          value: () => rez.headers,
          writable: false,
        });
        Object.defineProperty(this, "readyState", {
          value: 4,
          writable: false,
        });
        Object.defineProperty(this, "response", {
          value: rez.body ? JSON.parse(rez.body) : undefined,
          writable: false,
        });
        Object.defineProperty(this, "responseText", {
          value: rez.body,
          writable: false,
        });
        Object.defineProperty(this, "status", {
          value: rez.statusCode,
          writable: false,
        });
        Object.defineProperty(this, "statusText", {
          value: rez.statusCode < 400 ? "OK" : "NOT OK",
          writable: false,
        });
        Object.defineProperty(this, "responseURL", {
          value: url,
          writable: false,
        });
        if (this.onloadstart) {
          this.onloadstart(new ProgressEvent("unmock-done"));
        }
        if (this.onload) {
          this.onload(new ProgressEvent("unmock-done"));
        }
        if (this.onloadend) {
          this.onloadend(new ProgressEvent("unmock-done"));
        }
        if (this.onreadystatechange) {
          this.onreadystatechange(new Event("unmock-done"));
        }
      };
      if (isCreateResponse(cb)) {
        doResponseEnd(cb(request));
      } else {
        cb(request, doResponseEnd, (e: Error) => {
          if (this.onerror) {
            this.onerror(new ProgressEvent(`${e.message} ${e.stack}`));
          }
        });
      }
    };
    const res = XMLHttpRequestOpen.apply(this, [
      method,
      url,
      async || false,
      username,
      password,
    ]);
    return res;
  };
  return XMLHttpRequestOpen;
};

export default replaceOpenAndReturnOriginal;
