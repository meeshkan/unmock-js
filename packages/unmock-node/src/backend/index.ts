import { IncomingMessage, ServerResponse } from "http";
import Mitm from "mitm";
import {
  FindResponse,
  IBackend,
  ISerializedRequest,
  ISerializedResponse,
  UnmockOptions,
} from "unmock-core";
import { serializeRequest } from "../serialize";
import * as constants from "./constants";
import { responseFinderFactory } from "./response-finder";

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
  );
  if (!serializedResponse) {
    throw Error(constants.MESSAGE_FOR_MISSING_MOCK);
  }
  respondFromSerializedResponse(serializedResponse, res);
};

let mitm: any;
export default class NodeBackend implements IBackend {
  public reset() {
    if (mitm) {
      mitm.disable();
    }
  }
  public initialize(options: UnmockOptions) {
    mitm = Mitm();
    mitm.on("connect", (socket: any, opts: any) => {
      if (options.isWhitelisted(opts.host)) {
        socket.bypass();
      }
    });
    const findResponse = responseFinderFactory();
    mitm.on("request", async (req: IncomingMessage, res: ServerResponse) => {
      try {
        await handleRequestResponse(findResponse, req, res);
      } catch (err) {
        // TODO Emit an error in the corresponding client request
        res.statusCode = constants.STATUS_CODE_FOR_ERROR;
        res.write(err.message);
        res.end();
      }
    });
  }
}
