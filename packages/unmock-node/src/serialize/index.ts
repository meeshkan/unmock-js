import * as http from "http";
import * as readable from "readable-stream";
import { ISerializedRequest } from "unmock-core";
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

class BodySerializer extends readable.Transform {
  public static async fromIncoming(incomingMessage: http.IncomingMessage) {
    const serializer = new BodySerializer();
    await readable.pipeline(incomingMessage, serializer);
    return serializer.body;
  }

  private body: string = "";

  // TODO Encoding
  public _transform(chunk: Buffer, _: string, done: () => void) {
    this.body += chunk.toString();
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
  headers: { [key: string]: string };
} {
  const { host: hostWithPort, ...headers } = interceptedRequest.headers;

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
    headers: headers as { [key: string]: string },
    host,
    method,
    path,
  };
}

/**
 * Serialize an incoming request, collecting the body.
 * @param interceptedRequest Incoming request
 */
export const serializeRequest = async (
  interceptedRequest: http.IncomingMessage,
): Promise<ISerializedRequest> => {
  const { method, path, host, headers } = extractVars(interceptedRequest);

  const isEncrypted = (interceptedRequest.connection as any).encrypted;
  const protocol = isEncrypted ? "https" : "http";

  const body = await BodySerializer.fromIncoming(interceptedRequest);

  const serializedRequest: ISerializedRequest = {
    body,
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
