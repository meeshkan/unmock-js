import debug from "debug";
import * as _ from "lodash";
import { formatMsg } from "../console";
import { responseCreatorFactory } from "../generator";
import { IInterceptor, IInterceptorFactory } from "../interceptor";
import {
  IListener,
  ISerializedRequest,
  ISerializedResponse,
  IServiceDef,
  IServiceDefLoader,
  IUnmockOptions,
  OnSerializedRequest,
  ServiceStoreType,
} from "../interfaces";
import { ServiceParser } from "../parser";
import { IServiceCore } from "../service/interfaces";
import { ServiceStore } from "../service/serviceStore";

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

export const buildRequestHandler = (
  createResponse: (req: ISerializedRequest) => ISerializedResponse | undefined,
): OnSerializedRequest => (
  serializedRequest: ISerializedRequest,
  sendResponse: (res: ISerializedResponse) => void,
  emitError: (e: Error) => void,
) => {
  try {
    debugLog("Serialized request", JSON.stringify(serializedRequest));
    const serializedResponse: ISerializedResponse = createResponse(
      serializedRequest,
    );

    debugLog("Responding with response", JSON.stringify(serializedResponse));
    sendResponse(serializedResponse);
  } catch (err) {
    emitError(Error(`unmock error: ${err.message}`));
  }
};

export interface IBackendOptions {
  interceptorFactory: IInterceptorFactory;
  listeners?: IListener[];
  serviceDefLoader?: IServiceDefLoader;
}

const NoopServiceDefLoader: IServiceDefLoader = {
  loadSync() {
    return [];
  },
};

export class Backend {
  public serviceStore: ServiceStore = new ServiceStore([]);
  public readonly interceptorFactory: IInterceptorFactory;
  public readonly serviceDefLoader: IServiceDefLoader;
  public handleRequest?: OnSerializedRequest;
  protected readonly requestResponseListeners: IListener[];
  private interceptor?: IInterceptor;

  public constructor({
    interceptorFactory,
    listeners,
    serviceDefLoader,
  }: IBackendOptions) {
    this.interceptorFactory = interceptorFactory;
    this.requestResponseListeners = listeners || [];
    this.serviceDefLoader = serviceDefLoader || NoopServiceDefLoader;
    this.loadServices();
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
      listeners: this.requestResponseListeners,
      options,
      store: this.serviceStore,
    });

    this.handleRequest = buildRequestHandler(createResponse);

    this.interceptor = this.interceptorFactory({
      onSerializedRequest: this.handleRequest,
      shouldBypassHost: options.isWhitelisted,
    });
  }

  public reset() {
    if (this.interceptor) {
      this.interceptor.disable();
      this.interceptor = undefined;
    }
    this.handleRequest = undefined;
    if (this.serviceStore) {
      // TODO - this is quite ugly :shrug:
      Object.values(this.serviceStore.services).forEach(service =>
        service.reset(),
      );
    }
  }

  public loadServices(): void {
    const serviceDefs = this.serviceDefLoader.loadSync();
    this.updateServiceDefs(serviceDefs);
  }

  protected updateServiceDefs(serviceDefs: IServiceDef[]) {
    const coreServices: IServiceCore[] = serviceDefs.map(serviceDef =>
      ServiceParser.parse(serviceDef),
    );

    this.serviceStore = new ServiceStore(coreServices);
  }
}

export default Backend;
