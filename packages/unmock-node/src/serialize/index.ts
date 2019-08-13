import debug from "debug";
import * as http from "http";
const readable = require("readable-stream"); // tslint:disable-line:no-var-requires
// import * as readable from "readable-stream";
import { IIncomingHeaders, ISerializedRequest } from "unmock-core";
import url from "url";

/**
 * Network serializers
 */
import _CompositeDeserializer from "./deserializer/composite";
import _FormDeserializer from "./deserializer/form";
import _JSONDeserializer from "./deserializer/json";
import _CompositeSerializer from "./serializer/composite";
import _FormSerializer from "./serializer/form";
import _JSONSerializer from "./serializer/json";

const CONTENT_TYPE_KEY = "content-type";
const MIME_JSON_TYPE = "application/json";

const debugLog = debug("unmock:node:serializer");

class BodySerializer extends readable.Transform {
  public static async fromIncoming(incomingMessage: http.IncomingMessage) {
    const serializer = new BodySerializer();
    await readable.pipeline(incomingMessage, serializer);
    return serializer.body;
  }

  private body?: string;

  // TODO Encoding
  public _transform(chunk: Buffer, _: string, done: () => void) {
    this.body = (this.body || "") + chunk.toString();
    this.push(chunk);
    done();
  }
}

function extractVars(
  interceptedRequest: http.IncomingMessage,
): {
  method: string;
  host: string;
  path: string;
  headers: IIncomingHeaders;
} {
  const headers = interceptedRequest.headers;

  const hostWithPort = headers.host;

  if (!hostWithPort) {
    throw new Error("No host");
  }

  const host = hostWithPort.split(":")[0];

  const { method, url: requestUrl } = interceptedRequest;
  if (!requestUrl) {
    throw new Error("Missing request url.");
  }
  if (!method) {
    throw new Error("Missing method");
  }

  const { pathname: path } = url.parse(requestUrl, true);

  if (!path) {
    throw new Error("Could not parse path");
  }

  return {
    headers,
    host,
    method,
    path,
  };
}

const hasContentTypeJson = (headers: IIncomingHeaders) =>
  headers[CONTENT_TYPE_KEY] !== undefined &&
  headers[CONTENT_TYPE_KEY]!.includes(MIME_JSON_TYPE);

const safelyParseJson = (body: string): string | object => {
  try {
    return JSON.parse(body);
  } catch (err) {
    debugLog(`Failed parsing body: ${body}`);
    return body;
  }
};

/**
 * Serialize an incoming request, collecting the body.
 * @param interceptedRequest Incoming request
 */
export const serializeRequest = async (
  interceptedRequest: http.IncomingMessage,
): Promise<ISerializedRequest> => {
  const { headers, host, method, path } = extractVars(interceptedRequest);

  const isEncrypted = (interceptedRequest.connection as any).encrypted;
  const protocol = isEncrypted ? "https" : "http";

  const body = await BodySerializer.fromIncoming(interceptedRequest);

  const deserializedBody =
    body === undefined || !hasContentTypeJson(headers)
      ? body
      : safelyParseJson(body);

  const serializedRequest: ISerializedRequest = {
    body: deserializedBody,
    headers,
    host,
    method,
    path,
    protocol,
  };
  return serializedRequest;
};

export const CompositeDeserializer = _CompositeDeserializer;
export const FormDeserializer = _FormDeserializer;
export const JSONDeserializer = _JSONDeserializer;
export const CompositeSerializer = _CompositeSerializer;
export const FormSerializer = _FormSerializer;
export const JSONSerializer = _JSONSerializer;
