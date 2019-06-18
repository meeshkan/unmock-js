import { IncomingMessage, ServerResponse } from "http";
import Mitm from "mitm";
import {
  CreateResponse,
  IBackend,
  IMock,
  IResponseCreatorFactoryInput,
  ISerializedRequest,
  ISerializedResponse,
  responseCreatorFactory,
  UnmockOptions,
} from "unmock-core";
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
    if (!serializedResponse) {
      throw Error(constants.MESSAGE_FOR_MISSING_MOCK);
    }
    respondFromSerializedResponse(serializedResponse, res);
  } catch (err) {
<<<<<<< HEAD
<<<<<<< HEAD
    // TODO Emit an error in the corresponding client request instead?
    const errorResponse: ISerializedResponse = {
      body: err.message,
      statusCode: constants.STATUS_CODE_FOR_ERROR,
    };
    respondFromSerializedResponse(errorResponse, res);
=======
    // TODO: Emit an error in the corresponding client request
=======
    // TODO Emit an error in the corresponding client request
>>>>>>> 8ad9714... Fetches schema for path in YAML file
    res.statusCode = constants.STATUS_CODE_FOR_ERROR;
    res.write(err.message);
    res.end();
>>>>>>> 82fd4d4... Constants in core, update core tslint
  }
}

let mitm: any;
export default class NodeBackend implements IBackend {
  private readonly mockGenerator: () => IMock[];

  public constructor(opts?: IResponseCreatorFactoryInput) {
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
