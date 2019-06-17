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

// TODO Actual implementation
const getResponseFinder: () => FindResponse = () => (_: ISerializedRequest) => {
  return {
    statusCode: 200,
  };
};

const respondFromSerializedResponse = (
  serializedResponse: ISerializedResponse,
  res: ServerResponse,
) => {
  res.statusCode = serializedResponse.statusCode;
  res.write(serializedResponse.body || "");
  res.end();
};

const mHttp = async (
  findResponse: FindResponse,
  req: IncomingMessage,
  res: ServerResponse,
) => {
  const serializedRequest: ISerializedRequest = await serializeRequest(req);
  const serializedResponse: ISerializedResponse | undefined = findResponse(
    serializedRequest,
  );
  if (!serializedResponse) {
    throw Error("Could not find a matching mock");
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
    const findResponse = getResponseFinder();
    mitm.on("request", async (req: IncomingMessage, res: ServerResponse) => {
      // TODO How to handle error?
      await mHttp(findResponse, req, res);
    });
  }
}
