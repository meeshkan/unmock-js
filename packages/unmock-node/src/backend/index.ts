import { IncomingMessage, ServerResponse } from "http";
import Mitm from "mitm";
import {
  CreateResponse,
  IBackend,
  ISerializedRequest,
  ISerializedResponse,
  responseCreatorFactory,
  UnmockOptions,
} from "unmock-core";
import { FsServiceDefLoader } from "../loaders/fs-service-def-loader";
import { serializeRequest } from "../serialize";
import * as constants from "./constants";

const respondFromSerializedResponse = (
  serializedResponse: ISerializedResponse,
  res: ServerResponse,
) => {
  res.writeHead(serializedResponse.statusCode, serializedResponse.headers);
  res.end(serializedResponse.body);
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
    if (serializedResponse === undefined) {
      throw Error(constants.MESSAGE_FOR_MISSING_MOCK);
    }
    respondFromSerializedResponse(serializedResponse, res);
  } catch (err) {
    // TODO Emit an error in the corresponding client request instead?
    const errorResponse: ISerializedResponse = {
      body: err.message,
      statusCode: constants.STATUS_CODE_FOR_ERROR,
    };
    respondFromSerializedResponse(errorResponse, res);
  }
}

export interface INodeBackendOptions {
  servicesDirectory?: string;
}

const nodeBackendDefaultOptions: INodeBackendOptions = {};

let mitm: any;
export default class NodeBackend implements IBackend {
  private readonly config: INodeBackendOptions;
  public constructor(config?: INodeBackendOptions) {
    this.config = { ...nodeBackendDefaultOptions, ...config };
  }

  public initialize(options: UnmockOptions) {
    mitm = Mitm();
    mitm.on("connect", (socket: any, opts: any) => {
      if (options.isWhitelisted(opts.host)) {
        socket.bypass();
      }
    });
    // Prepare the request-response mapping by bootstrapping all dependencies here
    const serviceDefLoader = new FsServiceDefLoader({
      servicesDir: this.config.servicesDirectory,
    });
    const createResponse = responseCreatorFactory({ serviceDefLoader });
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
