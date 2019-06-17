import { IncomingMessage, ServerResponse } from "http";

import {
  FindResponse,
  ISerializedRequest,
  ISerializedResponse,
} from "unmock-core";
import { serializeRequest } from "../serialize";

const respondFromSerializedResponse = (
  serializedResponse: ISerializedResponse,
  res: ServerResponse,
) => {
  // TODO Headers
  res.statusCode = serializedResponse.statusCode;
  res.write(serializedResponse.body || "");
  res.end();
};

export const handleRequestResponse = async (
  findResponse: FindResponse,
  req: IncomingMessage,
  res: ServerResponse,
) => {
  const serializedRequest: ISerializedRequest = await serializeRequest(req);
  const serializedResponse: ISerializedResponse | undefined = findResponse(
    serializedRequest,
  ) || { statusCode: 200 };
  if (!serializedResponse) {
    throw Error("Could not find a matching mock");
  }
  respondFromSerializedResponse(serializedResponse, res);
};
