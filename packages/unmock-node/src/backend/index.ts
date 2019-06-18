import { IncomingMessage, ServerResponse } from "http";
import Mitm from "mitm";
import {
  CreateResponse,
  IBackend,
  IMock,
  ISerializedRequest,
  ISerializedResponse,
  UnmockOptions,
} from "unmock-core";
import { serializeRequest } from "../serialize";
import * as constants from "./constants";
import { responseCreatorFactory } from "./response-creator";

const respondFromSerializedResponse = (
  serializedResponse: ISerializedResponse,
  res: ServerResponse,
) => {
  res.statusCode = serializedResponse.statusCode;

  const responseHeaders = serializedResponse.headers;
  if (responseHeaders) {
    Object.entries(responseHeaders).forEach(([k, v]) => {
      if (v) {
        res.setHeader(k, v);
      }
    });
  }

  res.write(serializedResponse.body || "");
  res.end();
};

async function handleRequestAndResponse(
  createResponse: CreateResponse,
  req: IncomingMessage,
  res: ServerResponse,
) {
  try {
    const serializedRequest: ISerializedRequest = await serializeRequest(req);
    const serializedResponse: ISerializedResponse | undefined = createResponse(
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
  private readonly mockGenerator: () => IMock[];

  public constructor(opts?: INodeBackendOptions) {
    this.mockGenerator = (opts && opts.mockGenerator) || (() => []);
  }

  public initialize(options: UnmockOptions) {
    mitm = Mitm();
    mitm.on("connect", (socket: any, opts: any) => {
      if (options.isWhitelisted(opts.host)) {
        socket.bypass();
      }
    });
    // Prepare the request-response mapping by bootstrapping all dependencies here
    const createResponse = responseCreatorFactory({
      mockGenerator: this.mockGenerator,
    });
    mitm.on("request", (req: IncomingMessage, res: ServerResponse) => {
      handleRequestAndResponse(createResponse, req, res);
    });
  }
  public reset() {
    if (mitm) {
      mitm.disable();
    }
  }
}
