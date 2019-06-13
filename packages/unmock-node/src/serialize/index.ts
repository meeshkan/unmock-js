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

/**
 * @param interceptedRequest
 */
export const serializeRequest = async (
  interceptedRequest: http.IncomingMessage,
): Promise<ISerializedRequest> => {
  const { method, url } = interceptedRequest;
  if (!url) {
    throw new Error("Missing url.");
  }
  if (!method) {
    throw new Error("Missing method");
  }

  const body = await BodySerializer.fromIncoming(interceptedRequest);

  const { hostname, pathname } = new URL(url as string);

  const serializedRequest: ISerializedRequest = {
    body,
    hostname,
    method: method as string,
    pathname,
  };
  return serializedRequest;
};

export const CompositeDeserializer = _CompositeDeserializer;
export const FormDeserializer = _FormDeserializer;
export const JSONDeserializer = _JSONDeserializer;
export const CompositeSerializer = _CompositeSerializer;
export const FormSerializer = _FormSerializer;
export const JSONSerializer = _JSONSerializer;
