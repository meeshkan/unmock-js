import debug from "debug";
import {
  HTTPMethod,
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

  const req: ISerializedRequest = {
    body: undefined, // TODO
    bodyAsJson: undefined, // TODO
    method,
    headers: {}, // TODO
    host: parsedUrl.host,
    path: parsedUrl.pathname, // TODO
    pathname: parsedUrl.pathname,
    query: parsedUrl.query,
    protocol: protocolWithoutColon,
  };

  debugLog(`Serialized request: ${JSON.stringify(req)}`);
  return req;
};
