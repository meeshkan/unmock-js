import * as http from "http";
import * as readable from "readable-stream";
import { ISerializedRequest } from "unmock-core";

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
): { method: string; host: string; path: string } {
  const { host } = interceptedRequest.headers;

  if (!host) {
    throw new Error("No host");
  }

  const { method, url } = interceptedRequest;
  if (!url) {
    throw new Error("Missing url.");
  }
  if (!method) {
    throw new Error("Missing method");
  }

  const { pathname: path } = new URL(url as string);
  return { host, method, path };
}

/**
 * Serialize an incoming request, collecting the body.
 * @param interceptedRequest Incoming request
 */
export const serializeRequest = async (
  interceptedRequest: http.IncomingMessage,
): Promise<ISerializedRequest> => {
  const { method, path, host } = extractVars(interceptedRequest);

  const isEncrypted = (interceptedRequest.connection as any).encrypted;
  const protocol = isEncrypted ? "https" : "http";

  const body = await BodySerializer.fromIncoming(interceptedRequest);

  const serializedRequest: ISerializedRequest = {
    body,
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
