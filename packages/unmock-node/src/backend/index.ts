import { IncomingMessage, ServerResponse } from "http";
import Mitm from "mitm";
import {
  IBackend,
  ISerializedRequest,
  ISerializedResponse,
  UnmockOptions,
} from "unmock-core";
import { serializeRequest } from "../serialize";

const getResponseForRequest = (_: ISerializedRequest): ISerializedResponse => {
  return {
    statusCode: 200,
  };
};
/*
const BufferToStringOrEmpty = (buffer: Buffer[], key: string) => {
  const retObj: { [key: string]: string } = {};
  if (buffer.length > 0) {
    retObj[key] = buffer.map(b => b.toString()).join("");
  }
  return retObj;
};
*/

let mitm: any;

const mHttp = async (req: IncomingMessage, res: ServerResponse) => {
  const serializedRequest: ISerializedRequest = await serializeRequest(req);
  const response: ISerializedResponse = getResponseForRequest(
    serializedRequest,
  );
  res.statusCode = response.statusCode;
  res.write(response.body || "");
  res.end();
};

export default class NodeBackend implements IBackend {
  public reset() {
    mitm.disable();
  }
  public initialize(options: UnmockOptions) {
    mitm = Mitm();
    mitm.on("connect", (socket: any, opts: any) => {
      if (options.isWhitelisted(opts.host)) {
        socket.bypass();
      }
    });
    mitm.on("request", async (req: IncomingMessage, res: ServerResponse) => {
      // TODO How to handle error?
      await mHttp(req, res);
    });
  }
}
