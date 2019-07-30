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

const errorForMissingTemplate = (sreq: ISerializedRequest) => {
  return `No matching template found for intercepted request. Please ensure that
  1. You have defined a service for host ${sreq.protocol}://${sreq.host}
  2. The service has a path matching "${sreq.method} ${sreq.path}"
  `;
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
      debugLog("No match found, emitting error");
      const errMsg = errorForMissingTemplate(serializedRequest);
      clientRequest.emit("error", Error(errMsg));
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
  private stateStore: any = undefined;

  public constructor(config?: INodeBackendOptions) {
    this.config = { ...nodeBackendDefaultOptions, ...config };
  }

  public get states() {
    return this.stateStore;
  }

  /**
   *
   * @param options
   * @returns `states` object, with which one can modify states of various services.
   */
  public initialize(options: UnmockOptions): any {
    if (process.env.NODE_ENV === "production" && !options.useInProduction) {
      throw new Error("Are you trying to run unmock in production?");
    }
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
    const { stateStore, createResponse } = responseCreatorFactory({
      serviceDefLoader,
    });

    this.mitm.on("request", (req: IncomingMessage, res: ServerResponse) =>
      this.mitmOnRequest(createResponse, req, res),
    );
    this.stateStore = stateStore;

    return stateStore;
  }

  public reset() {
    if (this.mitm) {
      this.mitm.disable();
      this.mitm = undefined;
    }
    if (this.stateStore) {
      this.stateStore.reset();
      this.stateStore = undefined;
    }
    ClientRequestTracker.stop();
  }

  private mitmOnRequest(
    createResponse: CreateResponse,
    req: IncomingMessage,
    res: ServerResponse,
  ) {
    debugLog("Handling incoming message...");
    req.on("error", (e: any) => debugLog("Error on intercepted request:", e));
    req.on("abort", () => {
      debugLog("Intercepted request aborted");
    });
    const clientRequest = ClientRequestTracker.pop(req);
    setImmediate(() => handleRequestAndResponse(createResponse, req, res, clientRequest));
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
