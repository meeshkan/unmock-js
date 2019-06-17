import { IncomingMessage, ServerResponse } from "http";
import Mitm from "mitm";
import {
  FindResponse,
  IBackend,
  IMock,
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

async function handleRequestAndResponse(
  findResponse: FindResponse,
  req: IncomingMessage,
  res: ServerResponse,
) {
  try {
    const serializedRequest: ISerializedRequest = await serializeRequest(req);
    const serializedResponse: ISerializedResponse | undefined = findResponse(
      serializedRequest,
    );
    if (!serializedResponse) {
      throw Error(constants.MESSAGE_FOR_MISSING_MOCK);
    }
    respondFromSerializedResponse(serializedResponse, res);
  } catch (err) {
    // TODO Emit an error in the corresponding client request
    res.statusCode = constants.STATUS_CODE_FOR_ERROR;
    res.write(err.message);
    res.end();
  }
}

interface INodeBackendOptions {
  mockGenerator?: () => IMock[];
}

let mitm: any;
export default class NodeBackend implements IBackend {
  private readonly mocks: IMock[];

  public constructor(opts?: INodeBackendOptions) {
    this.mocks = (opts && opts.mockGenerator && opts.mockGenerator()) || [];
  }

  public initialize(options: UnmockOptions) {
    mitm = Mitm();
    mitm.on("connect", (socket: any, opts: any) => {
      if (options.isWhitelisted(opts.host)) {
        socket.bypass();
      }
    });
    const findResponse = responseFinderFactory({ mocksOpt: this.mocks });
    mitm.on("request", (req: IncomingMessage, res: ServerResponse) => {
      handleRequestAndResponse(findResponse, req, res);
    });
  }
  public reset() {
    if (mitm) {
      mitm.disable();
    }
  }
}
