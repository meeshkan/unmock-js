import debug from "debug";
import {
  ClientRequest,
  IncomingMessage,
  RequestOptions,
  ServerResponse,
} from "http";
import * as _ from "lodash";
import Mitm = require("mitm");
import * as net from "net";
import { CustomConsole } from "../console";
import { FsServiceDefLoader } from "../fs-service-def-loader";
import { responseCreatorFactory } from "../generator";
import {
  CreateResponse,
  ISerializedRequest,
  ISerializedResponse,
  IServiceDef,
  IUnmockOptions,
  ServiceStoreType,
} from "../interfaces";
import FSLogger from "../loggers/filesystem-logger";
import FSSnapshotter from "../loggers/snapshotter";
import { ServiceParser } from "../parser";
import { serializeRequest } from "../serialize";
import { IObjectToService, IServiceCore } from "../service/interfaces";
import { ServiceStore } from "../service/serviceStore";
import { resolveUnmockDirectories } from "../utils";
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
  const serverUrl = `${sreq.protocol}://${sreq.host}`;
  return `No matching template found for intercepted request. Please ensure that

  1. You have defined a service for host ${serverUrl}
  2. The service has a path matching "${sreq.method} ${sreq.pathname}"

  For example, add the following to your service:

  servers:
    - url: ${sreq.protocol}://${sreq.host}
  paths:
    ${sreq.pathname}:
      ${sreq.method.toLowerCase()}:
        // OpenAPI operation object
        responses:
          200:
            ...
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
      const formatted = CustomConsole.format("instruct", errMsg);
      clientRequest.emit("error", Error(formatted));
      return;
    }
    debugLog("Responding with response", JSON.stringify(serializedResponse));
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

export default class NodeBackend {
  public serviceStore: ServiceStore;
  private readonly config: INodeBackendOptions;
  private mitm: any;

  public constructor(config?: INodeBackendOptions) {
    this.config = { ...nodeBackendDefaultOptions, ...config };
    this.serviceStore = new ServiceStore([]);
  }

  public get services(): ServiceStoreType {
    return (this.serviceStore && this.serviceStore.services) || {};
  }

  public initServices(defLoader?: FsServiceDefLoader) {
    // Resolve where services can live
    const unmockDirectories = this.config.servicesDirectory
      ? [this.config.servicesDirectory]
      : resolveUnmockDirectories();

    debugLog(`Found unmock directories: ${JSON.stringify(unmockDirectories)}`);

    // Prepare the request-response mapping by bootstrapping all dependencies here
    const serviceDefLoader =
      defLoader ||
      new FsServiceDefLoader({
        unmockDirectories,
      });

    const serviceDefs: IServiceDef[] = serviceDefLoader.loadSync();
    const coreServices: IServiceCore[] = serviceDefs.map(serviceDef =>
      ServiceParser.parse(serviceDef),
    );

    this.serviceStore = new ServiceStore(coreServices);
  }

  /**
   *
   * @param options
   * @returns `states` object, with which one can modify states of various services.
   */
  public initialize(options: IUnmockOptions) {
    if (process.env.NODE_ENV === "production" && !options.useInProduction()) {
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

    this.initServices();

    const createResponse = responseCreatorFactory({
      listeners: [
        new FSLogger({ directory: this.config.servicesDirectory }),
        FSSnapshotter.getOrUpdateSnapshotter({}),
      ],
      options,
      store: this.serviceStore,
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
    if (this.serviceStore) {
      // TODO - this is quite ugly :shrug:
      Object.values(this.serviceStore.services).forEach(service =>
        service.reset(),
      );
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
    req.on("abort", () => debugLog("Intercepted request aborted"));
    const clientRequest = ClientRequestTracker.pop(req);
    setImmediate(() =>
      handleRequestAndResponse(createResponse, req, res, clientRequest),
    );
  }

  private mitmOnConnect(
    { isWhitelisted }: IUnmockOptions,
    socket: IBypassableSocket,
    opts: RequestOptions,
  ) {
    if (isWhitelisted(opts.host || "")) {
      socket.bypass();
    }
  }
}
