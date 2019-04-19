import { IUnmockInternalOptions } from "unmock/unmock-options";
import { buildPath, endReporter, hostIsWhitelisted,
  UNMOCK_UA_HEADER_NAME, unmockUAHeaderValue } from "unmock/util";

const UNMOCK_AUTH = "___u__n_m_o_c_k_a_u_t__h_";
const XMLHttpRequestOpen = XMLHttpRequest.prototype.open;
const XMLHttpRequestSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader;
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

// TODO: won't work if open is not called first, as this sets everything else
// is there a possible scenario where open is not called first
export const initialize = (
  story: {story: string[]},
  token: string | undefined,
  { logger, persistence, ignore, save, signature, unmockHost, whitelist }: IUnmockInternalOptions) => {
  XMLHttpRequest.prototype.open = function(
    method: string,
    url: string,
    async?: boolean,
    username?: string | null,
    password?: string | null): void {

    let data: Document | BodyInit | null = null;
    let selfcall = false;
    const ro = new URL(url);
    if (hostIsWhitelisted(whitelist ? whitelist.concat(unmockHost) : [], ro.host, ro.hostname)) {
      return XMLHttpRequestOpen.apply(this, [method, url, async || false, username, password]);
    }
    const headerz: {[name: string]: string} = {};
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
    if ((ro.hostname === unmockHost) || (ro.host === unmockHost)) {
      // self call, we ignore
      selfcall = true;
    }
    this.setRequestHeader = function(name: string, value: string) {
      if (hostIsWhitelisted(whitelist ? whitelist.concat(unmockHost) : [], ro.host, ro.hostname)) {
        return XMLHttpRequestSetRequestHeader.apply(this, [name, value]);
      }
      if (name === "Authorization") {
        // store, but do not pass onto request
        headerz[name] = value;
      } else if (name === UNMOCK_AUTH) {
        // do not store, but pass onto request
        return XMLHttpRequestSetRequestHeader.apply(this, ["Authorization", value]);
      } else {
        // store and pass onto request
        headerz[name] = value;
        return XMLHttpRequestSetRequestHeader.apply(this, [name, value]);
      }
    };
    const setOnReadyStateChange = (request: XMLHttpRequest) => {
      const onreadystatechange = request.onreadystatechange;
      request.onreadystatechange = (ev: Event) => {
        if (request.readyState === 4) {
          if (!hostIsWhitelisted(whitelist ? whitelist.concat(unmockHost) : [], ro.host, ro.hostname)) {
            endReporter(
              request.response,
              data,
              parseResponseHeaders(request.getAllResponseHeaders()),
              ro.host,
              ro.hostname,
              logger,
              method,
              ro.pathname,
              persistence,
              save,
              selfcall,
              story.story,
              token !== undefined,
              {
                requestHeaders: headerz,
                requestHost: ro.host || ro.hostname,
                requestMethod: method,
                requestPath: ro.pathname,
              });
          }
        }
        if (typeof onreadystatechange === "function") {
          return onreadystatechange.apply(request, [ev]);
        }
      };
    };
    this.send = function(body?: Document | BodyInit | null): void {
      if (hostIsWhitelisted(whitelist ? whitelist.concat(unmockHost) : [], ro.host, ro.hostname)) {
        return XMLHttpRequestSend.apply(this, [body]);
      }
      setOnReadyStateChange(this);
      if (body) {
        data = body;
      }
      return XMLHttpRequestSend.apply(this, [body]);
    };
    setOnReadyStateChange(this);
    const res = XMLHttpRequestOpen
      .apply(this, [method, `https://${unmockHost}${pathForFake}`, async || false, username, password]);
    if (token) {
      this.setRequestHeader(UNMOCK_AUTH, `Bearer ${token}`);
    }
    this.setRequestHeader(UNMOCK_UA_HEADER_NAME, JSON.stringify(unmockUAHeaderValue()));
    return res;
  };
};

export const reset = () => {
  XMLHttpRequest.prototype.open = XMLHttpRequestOpen;
};
