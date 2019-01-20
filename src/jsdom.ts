import debug from "debug";
import logger from "./logger";
import { IUnmockInternalOptions } from "./unmock-options";
import { buildPath, endReporter, hostIsWhitelisted } from "./util";

const UNMOCK_AUTH = "___u__n_m_o_c_k_a_u_t__h_";
const XMLHttpRequestOpen = XMLHttpRequest.prototype.open;
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
  token: string,
  { ignore, save, saveCallback, unmockHost, unmockPort, whitelist }: IUnmockInternalOptions) => {
  XMLHttpRequest.prototype.open = function(
    method: string,
    url: string,
    async?: boolean,
    username?: string | null,
    password?: string | null): void {
    let data: Document | BodyInit | null = null;
    let selfcall = false;
    const ro = new URL(url);
    if (hostIsWhitelisted(whitelist, ro.host, ro.hostname)) {
      return XMLHttpRequestOpen.apply(this, [method, url, async || false, username, password]);
    }
    const headerz: {[name: string]: string} = {};
    const pathForFake = buildPath(headerz, ro.host, ro.hostname, ignore, method, ro.pathname, story.story, unmockHost);
    debug("unmock")(`${pathForFake}`);
    if ((ro.hostname === unmockHost) || (ro.host === unmockHost)) {
      // self call, we ignore
      selfcall = true;
    }
    const setRequestHeader = this.setRequestHeader;
    this.setRequestHeader = function(name: string, value: string) {
      if (name === "Authorization") {
        // store, but do not pass onto request
        headerz[name] = value;
      } else if (name === UNMOCK_AUTH) {
        // do not store, but pass onto request
        setRequestHeader.apply(this, ["Authorization", value]);
      } else {
        // store and pass onto request
        headerz[name] = value;
        setRequestHeader.apply(this, [name, value]);
      }
    };
    this.send = function(body?: Document | BodyInit | null): void {
      if (body) {
        data = body;
      }
      XMLHttpRequestSend.apply(this, [body]);
    };
    const onreadystatechange = this.onreadystatechange;
    this.onreadystatechange = (ev: Event) => {
      endReporter(
        this.response,
        data,
        parseResponseHeaders(this.getAllResponseHeaders()),
        ro.host,
        ro.hostname,
        method,
        ro.pathname,
        save,
        saveCallback,
        selfcall,
        story.story);
      if (typeof onreadystatechange === "function") {
        onreadystatechange.apply(this, [ev]);
      }
    };
    XMLHttpRequestOpen.apply(this, [method, pathForFake || "", async || false, username, password]);
    this.setRequestHeader(UNMOCK_AUTH, `Bearer ${token}`);
  };
};

export const reset = () => {
  XMLHttpRequest.prototype.open = XMLHttpRequestOpen;
};
