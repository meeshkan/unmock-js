import { IUnmockInternalOptions, Mode } from "unmock-core";
import { hash as _hash, util } from "unmock-core";
import { IBackend } from "unmock-core";

const { v0 } = _hash;

const {
  buildPath,
  endReporter,
  hostIsWhitelisted,
  UNMOCK_UA_HEADER_NAME,
} = util;

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
    story: { story: string[] },
    token: string | undefined,
    {
      logger,
      persistence,
      ignore,
      mode,
      save,
      signature,
      unmockHost,
      whitelist,
    }: IUnmockInternalOptions,
  ) {
    XMLHttpRequest.prototype.open = function(
      method: string,
      url: string,
      async?: boolean,
      username?: string | null,
      password?: string | null,
    ): void {
      let data: Document | BodyInit | null = null;
      const ro = new URL(url);
      if (
        hostIsWhitelisted(
          whitelist ? whitelist.concat(unmockHost) : [],
          ro.host,
          ro.hostname,
        )
      ) {
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
        if (
          hostIsWhitelisted(
            whitelist ? whitelist.concat(unmockHost) : [],
            ro.host,
            ro.hostname,
          )
        ) {
          return XMLHttpRequestSetRequestHeader.apply(this, [name, value]);
        }
        if (name === "Authorization") {
          // store, but do not pass onto request
          headerz[name] = value;
        } else if (name === UNMOCK_AUTH || name === UNMOCK_UA_HEADER_NAME) {
          // do not store, but pass onto request
          return XMLHttpRequestSetRequestHeader.apply(this, [
            "Authorization",
            value,
          ]);
        } else {
          // store and pass onto request
          headerz[name] = value;
          return XMLHttpRequestSetRequestHeader.apply(this, [name, value]);
        }
      };
      const doEndReporting = (hash: string, fromCache: boolean, responseBody: string, responseHeaders: any) =>
        endReporter(
          hash,
          logger,
          persistence,
          save,
          story.story,
          token !== undefined,
          fromCache,
          { lang: "jsdom" },
          {
            ...(data ? { body : data.toString()} : {}),
            headers: headerz,
            host: ro.host || ro.hostname,
            method,
            path: ro.pathname,
          },
          {
            body: responseBody,
            headers: responseHeaders,
          },
        );
      const setOnReadyStateChange = (hash: string, request: XMLHttpRequest, shouldEndReport: boolean) => {
        const onreadystatechange = request.onreadystatechange;
        request.onreadystatechange = (ev: Event) => {
          if (request.readyState === 4) {
            if (
              !hostIsWhitelisted(
                whitelist ? whitelist.concat(unmockHost) : [],
                ro.host,
                ro.hostname,
              )
            ) {
              if (shouldEndReport) {
                doEndReporting(hash, false, request.response, parseResponseHeaders(request.getAllResponseHeaders()));
              }
            }
          }
          if (typeof onreadystatechange === "function") {
            return onreadystatechange.apply(request, [ev]);
          }
        };
      };
      this.send = function(body?: Document | BodyInit | null): void {
        if (
          hostIsWhitelisted(
            whitelist ? whitelist.concat(unmockHost) : [],
            ro.host,
            ro.hostname,
          )
        ) {
          return XMLHttpRequestSend.apply(this, [body]);
        }
        console.log("computing hash", {
          body: data,
          headers: headerz,
          hostname: ro.hostname || ro.host,
          method,
          path: ro.pathname,
          story,
          ...(signature ? {signature} : {}),
          ...(userId ? {user_id: userId} : {}),
        });
        const hash = v0({
          body: data,
          headers: headerz,
          hostname: ro.hostname || ro.host,
          method,
          path: ro.pathname,
          story,
          ...(signature ? {signature} : {}),
          ...(userId ? {user_id: userId} : {}),
        }, ignore);
        const hasHash = persistence.hasHash(hash);
        const makesNetworkCall = mode === Mode.ALWAYS_CALL_UNMOCK ||
          (mode === Mode.CALL_UNMOCK_FOR_NEW_MOCKS && !hasHash);
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
            value: `https://${ro.hostname || ro.host}${ro.pathname}`,
            writable: false,
          });
          if (this.onloadstart) { this.onloadstart(new ProgressEvent("unmock-cache")); }
          if (this.onload) { this.onload(new ProgressEvent("unmock-cache")); }
          if (this.onloadend) { this.onloadend(new ProgressEvent("unmock-cache")); }
          if (this.onreadystatechange) { this.onreadystatechange(new Event("unmock-cache")); }
        } else {
          setOnReadyStateChange(hash, this, true);
          return XMLHttpRequestSend.apply(this, [body]);
        }
      };
      // there should be no end reporting (=== 4) yet
      setOnReadyStateChange("<placeholder>", this, true);
      const pathForFake = buildPath(
        headerz,
        ro.host,
        ro.hostname,
        ignore,
        method,
        ro.pathname,
        signature,
        story.story,
        unmockHost,
        token !== undefined,
      );
      const res = XMLHttpRequestOpen.apply(this, [
        method,
        `https://${unmockHost}${pathForFake}`,
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
