import debug from "debug";
import { typeUtils } from "unmock-core";
import { ISerializedRequest } from "unmock-core/dist/interfaces";
import URLParse = require("url-parse");

const debugLog = debug("unmock:fetch-mitm");

export default (
  url: string,
  methodInUpperOrLowercase: string,
  headers: { [name: string]: string },
  body?: Document | BodyInit | null,
): ISerializedRequest => {
  const method = methodInUpperOrLowercase.toLowerCase();
  debugLog(`Serializing request to: ${method} ${url}`);

  if (!typeUtils.isRESTMethod(method)) {
    throw new Error(`Unknown method: ${method}`);
  }

  const parsedUrl = new URLParse(url, true);

  const protocolWithoutColon = parsedUrl.protocol.replace(":", "");

  if (!typeUtils.isKnownProtocol(protocolWithoutColon)) {
    throw new Error(`Unknown protocol: ${protocolWithoutColon}`);
  }

  const useableBody = typeof body === "string" ? body : undefined; // TODO use more than string
  let maybeJson: any | undefined = undefined;
  try {
    if (useableBody) {
      maybeJson = JSON.parse(useableBody);
    }
  } catch {
    // do nothing
  }

  const req: ISerializedRequest = {
    body: useableBody,
    bodyAsJson: maybeJson,
    method,
    headers: Object.entries(headers).map(([a, b]) => ({[a.toLowerCase()]: b})).reduce((a, b) => ({ ...a, ...b }), {}),
    host: parsedUrl.host,
    path: parsedUrl.pathname, // TODO
    pathname: parsedUrl.pathname,
    query: parsedUrl.query,
    protocol: protocolWithoutColon,
  };

  debugLog(`Serialized request: ${JSON.stringify(req)}`);
  return req;
};
