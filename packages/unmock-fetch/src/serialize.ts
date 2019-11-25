import debug from "debug";
import { typeUtils } from "unmock-core";
import {
  IIncomingHeaders,
  ISerializedRequest,
} from "unmock-core/dist/interfaces";
import URLParse = require("url-parse");
import { Headers } from "./types";

const debugLog = debug("unmock:fetch-mitm");

const isRequest = (url: RequestInfo): url is Request => {
  return typeof url !== "string";
};

const parseHeadersObject = (headers: Headers): IIncomingHeaders => {
  const heads: Record<string, string> = {};
  headers.forEach((value, key) => {
    heads[typeUtils.normalizeHeaderKey(key)] = value;
  });
  return heads;
};

/**
 * Normalize headers by mapping all key values
 * as expected by unmock.
 * @param headers
 */
const normalizeHeaders = (headers: IIncomingHeaders): IIncomingHeaders => {
  const newHeaders: IIncomingHeaders = {};
  Object.keys(headers).forEach((key: string) => {
    const normalizedKey = typeUtils.normalizeHeaderKey(key);
    newHeaders[normalizedKey] = headers[key];
  });
  return newHeaders;
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
      const heads: Record<string, string | string[]> = {};
      headers.forEach((arr: string[]) => {
        if (arr.length < 2) {
          throw new Error(`Too short list as header, length: {arr.length}`);
        }
        const key = typeUtils.normalizeHeaderKey(arr[0]);
        const values = arr.slice(1);
        heads[key] = values;
      });
      return heads;
    }

    // Record<string, string>
    return normalizeHeaders(headers);
  }

  return {};
};

const serializeFromUrlAndInit = (
  url: string,
  init?: RequestInit,
): ISerializedRequest => {
  debugLog(`Serializing request to: ${url}`);
  const method = (init && init.method && init.method.toLowerCase()) || "get";

  if (!typeUtils.isRESTMethod(method)) {
    throw new Error(`Unknown method: ${method}`);
  }

  const parsedUrl = new URLParse(url, true);

  const protocolWithoutColon = parsedUrl.protocol.replace(":", "");

  if (!typeUtils.isKnownProtocol(protocolWithoutColon)) {
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

export default (
  urlOrRequest: RequestInfo,
  init?: RequestInit,
): ISerializedRequest => {
  if (isRequest(urlOrRequest)) {
    throw new Error(`Request instance not yet serializable`);
  }

  return serializeFromUrlAndInit(urlOrRequest, init);
};
