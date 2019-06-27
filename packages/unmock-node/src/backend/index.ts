import debug from "debug";
import {
  ClientRequest,
  IncomingMessage,
  RequestOptions,
  ServerResponse,
} from "http";
import _ from "lodash";
import Mitm from "mitm";
import net from "net";
import {
  CreateResponse,
  IBackend,
  ISerializedRequest,
  ISerializedResponse,
  responseCreatorFactory,
  UnmockOptions,
} from "unmock-core";
import { v4 as uuidv4 } from "uuid";
import { FsServiceDefLoader } from "../loaders/fs-service-def-loader";
import { serializeRequest } from "../serialize";
import * as constants from "./constants";

const debugLog = debug("unmock:node");

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
  clientRequest: ClientRequest,
) {
  try {
    const serializedRequest: ISerializedRequest = await serializeRequest(req);
    debugLog("Serialized request", JSON.stringify(serializedRequest));
    const serializedResponse: ISerializedResponse | undefined = createResponse(
      serializedRequest,
    );

    if (serializedResponse === undefined) {
      debugLog("No match found, emitting error");
      clientRequest.emit("error", Error("No matching template found"));
      return;
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

interface IRegisteredSocket extends net.Socket {
  __unmock_req_id?: string;
  bypass: () => void;
}

const nodeBackendDefaultOptions: INodeBackendOptions = {};
const UNMOCK_INTERNAL_HTTP_HEADER = "x-unmock-req-id";

export default class NodeBackend implements IBackend {
  private readonly config: INodeBackendOptions;
  private clientRequests: {
    [id: string]: {
      clientOptions: RequestOptions;
      clientRequest?: ClientRequest;
    };
  } = {};
  private origOnSocket?: (socket: net.Socket) => void;
  private mitm: any;

  public constructor(config?: INodeBackendOptions) {
    this.config = { ...nodeBackendDefaultOptions, ...config };
  }

  public initialize(options: UnmockOptions) {
    if (this.mitm !== undefined) {
      this.reset();
    }
    this.mitm = Mitm();
    this.origOnSocket = ClientRequest.prototype.onSocket;
    const self = this;
    ClientRequest.prototype.onSocket = _.flowRight(
      this.origOnSocket,
      function(
        this: ClientRequest,
        socket: IRegisteredSocket,
      ): IRegisteredSocket {
        if (socket.__unmock_req_id !== undefined) {
          debugLog("New socket on client request", socket.__unmock_req_id);
          self.clientRequests[socket.__unmock_req_id].clientRequest = this;
          this.setHeader(UNMOCK_INTERNAL_HTTP_HEADER, socket.__unmock_req_id);
        }

        return socket;
      },
    );

    // Client-side socket connect
    this.mitm.on(
      "connect",
      (socket: IRegisteredSocket, opts: RequestOptions) => {
        socket.__unmock_req_id = uuidv4();
        this.clientRequests[socket.__unmock_req_id] = {
          clientOptions: opts,
        };
        if (options.isWhitelisted(opts.host || "")) {
          socket.bypass();
        }
      },
    );

    // Prepare the request-response mapping by bootstrapping all dependencies here
    const serviceDefLoader = new FsServiceDefLoader({
      servicesDir: this.config.servicesDirectory,
    });
    const createResponse = responseCreatorFactory({
      serviceDefLoader,
    });

    this.mitm.on("request", (req: IncomingMessage, res: ServerResponse) => {
      debugLog(`Existing client request IDs`, Object.keys(this.clientRequests));
      const headers = req.headers;
      const reqId = headers[UNMOCK_INTERNAL_HTTP_HEADER];
      debugLog(`Intercepted incoming request with ID ${reqId}`);
      if (typeof reqId !== "string") {
        throw Error("No idea what to do here");
      }
      const clientRequest = this.clientRequests[reqId].clientRequest;
      if (clientRequest === undefined) {
        throw Error("Something very broken here too");
      }
      handleRequestAndResponse(createResponse, req, res, clientRequest);
    });
  }

  public reset() {
    if (this.mitm) {
      this.mitm.disable();
      this.mitm = undefined;
    }
    if (this.origOnSocket) {
      ClientRequest.prototype.onSocket = this.origOnSocket;
      this.origOnSocket = undefined;
    }
    this.clientRequests = {};
  }
}
