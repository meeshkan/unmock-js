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
import { FsServiceDefLoader } from "../loaders/fs-service-def-loader";
import { serializeRequest } from "../serialize";
import ClientRequestTracker from "./client-request-tracker";

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

const nodeBackendDefaultOptions: INodeBackendOptions = {};

interface IBypassableSocket extends net.Socket {
  bypass: () => void;
}

export default class NodeBackend implements IBackend {
  private readonly config: INodeBackendOptions;
  private mitm: any;

  public constructor(config?: INodeBackendOptions) {
    this.config = { ...nodeBackendDefaultOptions, ...config };
  }

  public initialize(options: UnmockOptions) {
    if (this.mitm !== undefined) {
      this.reset();
    }
    this.mitm = Mitm();

    ClientRequestTracker.start();

    // Client-side socket connect, use to bypass connections
    this.mitm.on("connect", (socket: IBypassableSocket, opts: RequestOptions) =>
      this.mitmOnConnect(options, socket, opts),
    );

    // Prepare the request-response mapping by bootstrapping all dependencies here
    const serviceDefLoader = new FsServiceDefLoader({
      servicesDir: this.config.servicesDirectory,
    });
    const createResponse = responseCreatorFactory({
      serviceDefLoader,
    });

    this.mitm.on("request", (req: IncomingMessage, res: ServerResponse) =>
      this.mitmOnRequest(createResponse, req, res),
    );
  }

  public reset() {
    if (this.mitm) {
      this.mitm.disable();
      this.mitm = undefined;
    }
    ClientRequestTracker.stop();
  }

  private mitmOnRequest(
    createResponse: CreateResponse,
    req: IncomingMessage,
    res: ServerResponse,
  ) {
    const clientRequest = ClientRequestTracker.extractTrackedClientRequest(req);
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
