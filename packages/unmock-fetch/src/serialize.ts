import debug from "debug";
import {
  HTTPMethod,
  IIncomingHeaders,
  IProtocol,
  ISerializedRequest,
} from "unmock-core/dist/interfaces";
import URLParse = require("url-parse");
import { Headers } from "./types";

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
  return typeof url !== "string";
};

const parseHeadersObject = (headers: Headers): IIncomingHeaders => {
  const heads: Record<string, string> = {};
  headers.forEach((value, key) => {
    heads[key] = value;
  });
  return heads;
};

export const parseHeaders = (
  urlOrRequest: RequestInfo,
  init?: RequestInit,
): IIncomingHeaders => {
  if (isRequest(urlOrRequest)) {
    return parseHeadersObject(urlOrRequest.headers);
  } else if (typeof init !== "undefined") {
    const headers = init.headers;
    if (typeof headers === "undefined") {
      return {};
    }

    if (headers instanceof Headers) {
      return parseHeadersObject(headers);
    }

    if (Array.isArray(headers)) {
      // string[][]
      const heads: Record<string, string> = {};
      headers.forEach((arr: string[]) => {
        const key = arr[0];
        const value = arr[1];
        heads[key] = value;
      });
      return heads;
    }

    // Record<string, string>
    return headers;
  }

  return {};
};

export default (
  urlOrRequest: RequestInfo,
  init?: RequestInit,
): ISerializedRequest => {
  if (isRequest(urlOrRequest)) {
    throw new Error(`Request instance not yet serializable`);
  }

  debugLog(`Serializing request to: ${urlOrRequest}`);

  const method = (init && init.method && init.method.toLowerCase()) || "get";

  if (!isRESTMethod(method)) {
    throw new Error(`Unknown method: ${method}`);
  }

  const parsedUrl = new URLParse(urlOrRequest, true);

  const protocolWithoutColon = parsedUrl.protocol.replace(":", "");

  if (!isKnownProtocol(protocolWithoutColon)) {
    throw new Error(`Unknown protocol: ${protocolWithoutColon}`);
  }

  const headers = parseHeaders(urlOrRequest, init);

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
