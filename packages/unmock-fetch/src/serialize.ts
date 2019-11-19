import debug from "debug";
import {
  HTTPMethod,
  IIncomingHeaders,
  IProtocol,
  ISerializedRequest,
} from "unmock-core/dist/interfaces";
import URLParse = require("url-parse");

const isKnownProtocol = (maybeProtocol: string): maybeProtocol is IProtocol =>
  /^https?$/.test(maybeProtocol);

// TODO Importing this from "unmock-core/dist/interfaces" does not work, it
// probably needs to be properly exported from the top-level package
export const isRESTMethod = (maybeMethod: string): maybeMethod is HTTPMethod =>
  [
    "get",
    "head",
    "post",
    "put",
    "patch",
    "delete",
    "options",
    "trace",
  ].includes(maybeMethod);

const debugLog = debug("unmock:fetch-mitm");

const isRequest = (url: RequestInfo): url is Request => {
  return false;
};

export const parseHeaders = (
  url: RequestInfo,
  init?: RequestInit,
): IIncomingHeaders => {
  const parseInternalHeaders = (headers: Headers): IIncomingHeaders => {
    return {};
  };

  if (isRequest(url)) {
    return parseInternalHeaders(url.headers);
  } else if (typeof init !== "undefined") {
    const headers = init.headers;
    if (typeof headers === "undefined") {
      return {};
    }

    if (Array.isArray(headers)) {
      // TODO
      return {};
    }

    if (headers instanceof Headers) {
      // TODO
      const heads: Record<string, string> = {};
      headers.forEach((value, key) => {
        heads[key] = value;
      });
      return heads;
    }

    return headers;
  }

  return {};
};

export default (url: RequestInfo, init?: RequestInit): ISerializedRequest => {
  if (typeof url !== "string") {
    throw new Error(`Request instance not yet supported`);
  }

  debugLog(`Serializing request to: ${url}`);

  const method = (init && init.method && init.method.toLowerCase()) || "get";

  if (!isRESTMethod(method)) {
    throw new Error(`Unknown method: ${method}`);
  }

  const parsedUrl = new URLParse(url, true);

  const protocolWithoutColon = parsedUrl.protocol.replace(":", "");

  if (!isKnownProtocol(protocolWithoutColon)) {
    throw new Error(`Unknown protocol: ${protocolWithoutColon}`);
  }

  const headers = parseHeaders(url, init);

  const req: ISerializedRequest = {
    body: undefined, // TODO
    bodyAsJson: undefined, // TODO
    method,
    headers,
    host: parsedUrl.host,
    path: parsedUrl.pathname, // TODO
    pathname: parsedUrl.pathname,
    query: parsedUrl.query,
    protocol: protocolWithoutColon,
  };

  debugLog(`Serialized request: ${JSON.stringify(req)}`);
  return req;
};
