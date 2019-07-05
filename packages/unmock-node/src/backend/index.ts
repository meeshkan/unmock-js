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
  clientRequest: ClientRequest, // For emitting errors
) {
  try {
    const serializedRequest: ISerializedRequest = await serializeRequest(req);
    debugLog("Serialized request", JSON.stringify(serializedRequest));
    const serializedResponse: ISerializedResponse | undefined = createResponse(
      serializedRequest,
    );

    if (serializedResponse === undefined) {
      // TODO Handle this properly
      debugLog("No match found, emitting error");
      clientRequest.emit("error", Error("No matching template found"));
      return;
    }
    respondFromSerializedResponse(serializedResponse, res);
  } catch (err) {
    clientRequest.emit("error", Error(`unmock error: ${err.message}`));
  }
}

export interface INodeBackendOptions {
  servicesDirectory?: string;
}

interface IBypassableSocket extends net.Socket {
  bypass: () => void;
}

const nodeBackendDefaultOptions: INodeBackendOptions = {};
const UNMOCK_INTERNAL_HTTP_HEADER = "x-unmock-req-id";

export default class NodeBackend implements IBackend {
  private readonly config: INodeBackendOptions;
  private clientRequests: {
    [requestId: string]: {
      clientRequest: ClientRequest;
    };
  } = {};
  private origOnSocket?: (socket: net.Socket) => void;
  private mitm: any;

  public constructor(config?: INodeBackendOptions) {
    this.config = { ...nodeBackendDefaultOptions, ...config };
  }

  /**
   *
   * @param options
   * @returns `states` object, with which one can modify states of various services.
   */
  public initialize(options: UnmockOptions): any {
    if (this.mitm !== undefined) {
      this.reset();
    }
    this.mitm = Mitm();

    const self = this;
    this.origOnSocket = ClientRequest.prototype.onSocket;

    /**
     * When a socket is assigned to a client request, create an internal ID
     * and add the ID in the request header. Thereby we can map
     * the server-side incoming request to the corresponding
     * client request and emit errors properly.
     * Borrowed from https://github.com/FormidableLabs/yesno.
     */
    ClientRequest.prototype.onSocket = _.flowRight(
      this.origOnSocket,
      function(
        this: ClientRequest,
        socket: IBypassableSocket,
      ): IBypassableSocket {
        const requestId = uuidv4();
        debugLog(
          `New socket assigned to client request, assigned ID: ${requestId}`,
        );
        self.clientRequests[requestId] = { clientRequest: this };
        this.setHeader(UNMOCK_INTERNAL_HTTP_HEADER, requestId);
        return socket;
      },
    );

    // Client-side socket connect, use to bypass connections
    this.mitm.on("connect", (socket: IBypassableSocket, opts: RequestOptions) =>
      this.mitmOnConnect.call(this, options, socket, opts),
    );

    // Prepare the request-response mapping by bootstrapping all dependencies here
    const serviceDefLoader = new FsServiceDefLoader({
      servicesDir: this.config.servicesDirectory,
    });
    const { stateStore, createResponse } = responseCreatorFactory({
      serviceDefLoader,
    });

    this.mitm.on("request", (req: IncomingMessage, res: ServerResponse) =>
      this.mitmOnRequest.call(this, createResponse, req, res),
    );

    return stateStore;
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

  private extractTrackedClientRequest(
    incomingMessage: IncomingMessage,
  ): ClientRequest {
    const { [UNMOCK_INTERNAL_HTTP_HEADER]: reqId } = incomingMessage.headers;
    debugLog(
      `Intercepted incoming request with ID ${reqId}, matching to existing IDs:`,
      Object.keys(this.clientRequests),
    );
    if (typeof reqId !== "string") {
      throw Error("Expected to get a non empty request ID");
    }
    const clientRequest = this.clientRequests[reqId].clientRequest;
    if (clientRequest === undefined) {
      throw Error(`Expected to find a client request for request ID ${reqId}`);
    }
    return clientRequest;
  }

  private mitmOnRequest(
    createResponse: CreateResponse,
    req: IncomingMessage,
    res: ServerResponse,
  ) {
    const clientRequest = this.extractTrackedClientRequest(req);
    handleRequestAndResponse(createResponse, req, res, clientRequest);
  }

  private mitmOnConnect(
    unmockOptions: UnmockOptions,
    socket: IBypassableSocket,
    opts: RequestOptions,
  ) {
    if (unmockOptions.isWhitelisted(opts.host || "")) {
      socket.bypass();
    }
  }
}
