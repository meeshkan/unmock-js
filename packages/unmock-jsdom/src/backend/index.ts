import { IStories, UnmockOptions } from "unmock-core";
import { constants, util } from "unmock-core";
import { IBackend } from "unmock-core";
import { computeHashV0 } from "unmock-hash";

const { buildPath, endReporter } = util;
const { UNMOCK_UA_HEADER_NAME } = constants;

const UNMOCK_AUTH = "___u__n_m_o_c_k_a_u_t__h_";
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
  // TODO: won't work if open is not called first, as this sets everything else
  // is there a possible scenario where open is not called first
  public initialize(
    userId: string | null,
    story: IStories,
    token: string | undefined,
    opts: UnmockOptions,
  ) {
    XMLHttpRequest.prototype.open = function(
      method: string,
      url: string,
      async?: boolean,
      username?: string | null,
      password?: string | null,
    ): void {
      let data: Document | BodyInit | null = null;
      const { signature, ignore, persistence } = opts;
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
        if (name === "Authorization") {
          // store, but do not pass onto request
          headerz[name] = value;
        } else if (name === UNMOCK_AUTH) {
          // do not store, but pass onto request
          return XMLHttpRequestSetRequestHeader.apply(this, [
            "Authorization",
            value,
          ]);
        } else if (name === UNMOCK_UA_HEADER_NAME) {
          // do not store, but pass onto request
          return XMLHttpRequestSetRequestHeader.apply(this, [
            UNMOCK_UA_HEADER_NAME,
            value,
          ]);
        } else {
          // store and pass onto request
          headerz[name] = value;
          return XMLHttpRequestSetRequestHeader.apply(this, [name, value]);
        }
      };
      const doEndReporting = (
        hash: string,
        fromCache: boolean,
        responseBody: string,
        responseHeaders: any,
      ) =>
        endReporter(
          opts,
          hash,
          story.story,
          token !== undefined,
          fromCache,
          { lang: "jsdom" },
          {
            ...(data ? { body: data.toString() } : {}),
            headers: headerz,
            host: finalHost,
            method,
            path: ro.pathname,
          },
          {
            body: responseBody,
            headers: responseHeaders,
          },
        );
      const setOnReadyStateChange = (
        hash: string,
        request: XMLHttpRequest,
        shouldEndReport: boolean,
      ) => {
        const onreadystatechange = request.onreadystatechange;
        request.onreadystatechange = (ev: Event) => {
          if (request.readyState === 4) {
            if (!opts.isWhitelisted(finalHost)) {
              if (shouldEndReport) {
                doEndReporting(
                  hash,
                  false,
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
        const hash = computeHashV0(
          {
            body: data || {},
            headers: headerz,
            hostname: finalHost,
            method,
            path: ro.pathname,
            story: story.story,
            ...(signature ? { signature } : {}),
            ...(userId ? { user_id: userId } : {}),
          },
          ignore,
        );
        const makesNetworkCall = opts.shouldMakeNetworkCall(hash);
        if (body) {
          data = body;
        }
        if (!makesNetworkCall) {
          const response = persistence.loadResponse(hash);
          doEndReporting(hash, true, response.headers, response.body);
          setOnReadyStateChange(hash, this, false);
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
        } else {
          setOnReadyStateChange(hash, this, true);
          return XMLHttpRequestSend.apply(this, [body]);
        }
      };
      // there should be no end reporting (=== 4) yet
      setOnReadyStateChange("<placeholder>", this, true);
      const pathForFake = buildPath(
        opts,
        headerz,
        finalHost,
        method,
        ro.pathname,
        story.story,
        token !== undefined,
      );
      const res = XMLHttpRequestOpen.apply(this, [
        method,
        opts.buildPath(pathForFake),
        async || false,
        username,
        password,
      ]);
      if (token) {
        this.setRequestHeader(UNMOCK_AUTH, `Bearer ${token}`);
      }
      this.setRequestHeader(UNMOCK_UA_HEADER_NAME, JSON.stringify("jsdom"));
      return res;
    };
  }

  public reset() {
    XMLHttpRequest.prototype.open = XMLHttpRequestOpen;
  }
}
