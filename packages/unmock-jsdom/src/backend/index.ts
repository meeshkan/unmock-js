import { IBackend, IUnmockOptions } from "unmock-core";

const XMLHttpRequestOpen = XMLHttpRequest.prototype.open;
const XMLHttpRequestSetRequestHeader =
  XMLHttpRequest.prototype.setRequestHeader;
const XMLHttpRequestSend = XMLHttpRequest.prototype.send;

const parseResponseHeaders = (headerStr: string) => {
  const headers: { [index: string]: string } = {};
  if (!headerStr) {
    return headers;
  }
  const headerPairs = headerStr.split("\u000d\u000a");
  for (const headerPair of headerPairs) {
    // Can't use split() here because it does the wrong thing
    // if the header value has the string ": " in it.
    const index = headerPair.indexOf("\u003a\u0020");
    if (index > 0) {
      const key = headerPair.substring(0, index);
      const val = headerPair.substring(index + 2);
      headers[key] = val;
    }
  }
  return headers;
};

export default class JSDomBackend implements IBackend {
  public get services() {
    return {};
  }
  // TODO: won't work if open is not called first, as this sets everything else
  // is there a possible scenario where open is not called first
  public initialize(opts: IUnmockOptions): any {
    XMLHttpRequest.prototype.open = function(
      method: string,
      url: string,
      async?: boolean,
      username?: string | null,
      password?: string | null,
    ): void {
      let data: Document | BodyInit | null = null;
      const ro = new URL(url);
      const finalHost = ro.host || ro.hostname;
      if (opts.isWhitelisted(finalHost)) {
        return XMLHttpRequestOpen.apply(this, [
          method,
          url,
          async || false,
          username,
          password,
        ]);
      }
      const headerz: { [name: string]: string } = {};
      this.setRequestHeader = function(name: string, value: string) {
        if (opts.isWhitelisted(finalHost)) {
          return XMLHttpRequestSetRequestHeader.apply(this, [name, value]);
        }
        // store and pass onto request
        headerz[name] = value;
        return XMLHttpRequestSetRequestHeader.apply(this, [name, value]);
      };
      const doEndReporting = (responseBody: string, responseHeaders: any) =>
        // TODO - actually report or do something with the request, or alternatively remove jsdom...
        opts.log(
          JSON.stringify({
            opts,
            // tslint:disable-next-line: object-literal-sort-keys
            lang: "jsdom",
            ...(data ? { body: data.toString() } : {}),
            headerz,
            host: finalHost,
            method,
            path: ro.pathname,
            body: responseBody,
            headers: responseHeaders,
          }),
        );
      const setOnReadyStateChange = (
        request: XMLHttpRequest,
        shouldEndReport: boolean,
      ) => {
        const onreadystatechange = request.onreadystatechange;
        request.onreadystatechange = (ev: Event) => {
          if (request.readyState === 4) {
            if (!opts.isWhitelisted(finalHost)) {
              if (shouldEndReport) {
                doEndReporting(
                  request.response,
                  parseResponseHeaders(request.getAllResponseHeaders()),
                );
              }
            }
          }
          if (typeof onreadystatechange === "function") {
            return onreadystatechange.apply(request, [ev]);
          }
        };
      };
      this.send = function(body?: Document | BodyInit | null): void {
        if (opts.isWhitelisted(finalHost)) {
          return XMLHttpRequestSend.apply(this, [body]);
        }
        if (body) {
          data = body;
        }
        const response = { body: "{}", headers: {} };
        doEndReporting(response.body, response.headers);
        setOnReadyStateChange(this, false);
        // uggggh...
        Object.defineProperty(this, "readyState", {
          value: 4,
          writable: false,
        });
        Object.defineProperty(this, "response", {
          value: response.body ? JSON.parse(response.body) : undefined,
          writable: false,
        });
        Object.defineProperty(this, "responseText", {
          value: response.body,
          writable: false,
        });
        Object.defineProperty(this, "status", {
          value: 200,
          writable: false,
        });
        Object.defineProperty(this, "statusText", {
          value: "OK",
          writable: false,
        });
        Object.defineProperty(this, "responseURL", {
          value: `https://${finalHost}${ro.pathname}`,
          writable: false,
        });
        if (this.onloadstart) {
          this.onloadstart(new ProgressEvent("unmock-cache"));
        }
        if (this.onload) {
          this.onload(new ProgressEvent("unmock-cache"));
        }
        if (this.onloadend) {
          this.onloadend(new ProgressEvent("unmock-cache"));
        }
        if (this.onreadystatechange) {
          this.onreadystatechange(new Event("unmock-cache"));
        }
      };
      // there should be no end reporting (=== 4) yet
      setOnReadyStateChange(this, true);
      const res = XMLHttpRequestOpen.apply(this, [
        method,
        ro.pathname,
        async || false,
        username,
        password,
      ]);
      return res;
    };
  }

  public reset() {
    XMLHttpRequest.prototype.open = XMLHttpRequestOpen;
  }
}
