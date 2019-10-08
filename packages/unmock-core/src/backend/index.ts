import debug from "debug";
import * as _ from "lodash";
import { CustomConsole } from "../console";
import { FsServiceDefLoader } from "../fs-service-def-loader";
import { responseCreatorFactory } from "../generator";
import {
  ISerializedRequest,
  ISerializedResponse,
  IServiceDef,
  IUnmockOptions,
  ServiceStoreType,
} from "../interfaces";
import FSLogger from "../loggers/filesystem-logger";
import FSSnapshotter from "../loggers/snapshotter";
import { ServiceParser } from "../parser";
import { IServiceCore } from "../service/interfaces";
import { ServiceStore } from "../service/serviceStore";
import { resolveUnmockDirectories } from "../utils";
import NodeInterceptor from "./node-interceptor";

export interface IInterceptorListener {
  createResponse(request: ISerializedRequest): ISerializedResponse | undefined;
}

export interface IInterceptorOptions {
  listener: IInterceptorListener;
  shouldBypassHost: (host: string) => boolean;
}

export type IInterceptorConstructor = new (
  options: IInterceptorOptions,
) => IInterceptor;

export interface IInterceptor {
  disable(): void;
}

function createInterceptor(
  ctor: IInterceptorConstructor,
  options: IInterceptorOptions,
): IInterceptor {
  return new ctor(options);
}

const debugLog = debug("unmock:node");

export const errorForMissingTemplate = (sreq: ISerializedRequest) => {
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

export const handleRequest = (
  serializedRequest: ISerializedRequest,
  createResponse: (req: ISerializedRequest) => ISerializedResponse | undefined,
  emitError: (e: Error) => void,
  sendResponse: (res: ISerializedResponse) => void,
) => {
  try {
    debugLog("Serialized request", JSON.stringify(serializedRequest));
    const serializedResponse: ISerializedResponse | undefined = createResponse(
      serializedRequest,
    );

    if (serializedResponse === undefined) {
      debugLog("No match found, emitting error");
      const errMsg = errorForMissingTemplate(serializedRequest);
      const formatted = CustomConsole.format("instruct", errMsg);
      emitError(Error(formatted));
      return;
    }
    debugLog("Responding with response", JSON.stringify(serializedResponse));
    sendResponse(serializedResponse);
  } catch (err) {
    emitError(Error(`unmock error: ${err.message}`));
  }
};

export interface INodeBackendOptions {
  servicesDirectory?: string;
}

const nodeBackendDefaultOptions: INodeBackendOptions = {};

export default class NodeBackend {
  public serviceStore: ServiceStore = new ServiceStore([]);
  private readonly config: INodeBackendOptions;
  private interceptor?: IInterceptor;

  public constructor(config?: INodeBackendOptions) {
    this.config = { ...nodeBackendDefaultOptions, ...config };
    this.loadServices();
  }

  public loadServices() {
    // Resolve where services can live
    const unmockDirectories = this.config.servicesDirectory
      ? [this.config.servicesDirectory]
      : resolveUnmockDirectories();

    debugLog(`Found unmock directories: ${JSON.stringify(unmockDirectories)}`);

    // Prepare the request-response mapping by bootstrapping all dependencies here
    const serviceDefLoader = new FsServiceDefLoader({
      unmockDirectories,
    });

    const serviceDefs: IServiceDef[] = serviceDefLoader.loadSync();
    const coreServices: IServiceCore[] = serviceDefs.map(serviceDef =>
      ServiceParser.parse(serviceDef),
    );

    this.serviceStore = new ServiceStore(coreServices);
  }

  public get services(): ServiceStoreType {
    return (this.serviceStore && this.serviceStore.services) || {};
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

    if (this.interceptor) {
      this.interceptor.disable();
      this.interceptor = undefined;
    }

    const createResponse = responseCreatorFactory({
      listeners: [
        new FSLogger({
          directory: this.config.servicesDirectory,
        }),
        FSSnapshotter.getOrUpdateSnapshotter({}),
      ],
      options,
      store: this.serviceStore,
    });

    this.interceptor = createInterceptor(NodeInterceptor, {
      listener: {
        createResponse,
      },
      shouldBypassHost: options.isWhitelisted,
    });
  }

  public reset() {
    if (this.interceptor) {
      this.interceptor.disable();
      this.interceptor = undefined;
    }
    if (this.serviceStore) {
      // TODO - this is quite ugly :shrug:
      Object.values(this.serviceStore.services).forEach(service =>
        service.reset(),
      );
    }
  }
}
