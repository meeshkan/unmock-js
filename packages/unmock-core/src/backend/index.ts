import debug from "debug";
import * as _ from "lodash";
import UnmockFaker from "../faker";
import { IInterceptor, IInterceptorFactory } from "../interceptor";
import {
  CreateResponse,
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
import {
  IRandomNumberGenerator,
  randomNumberGenerator,
} from "../random-number-generator";
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
  createResponse: CreateResponse,
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
  randomNumberGenerator?: IRandomNumberGenerator;
}

const NoopServiceDefLoader: IServiceDefLoader = {
  loadSync() {
    return [];
  },
};

export class Backend {
  public readonly serviceStore: ServiceStore = new ServiceStore([]);
  public readonly interceptorFactory: IInterceptorFactory;
  public readonly serviceDefLoader: IServiceDefLoader;
  public readonly randomNumberGenerator: IRandomNumberGenerator;
  public faker: UnmockFaker;
  public handleRequest?: OnSerializedRequest;
  protected readonly requestResponseListeners: IListener[];
  private interceptor?: IInterceptor;

  public constructor({
    interceptorFactory,
    listeners,
    randomNumberGenerator: rng,
    serviceDefLoader,
  }: IBackendOptions) {
    this.interceptorFactory = interceptorFactory;
    this.requestResponseListeners = listeners || [];
    this.serviceDefLoader = serviceDefLoader || NoopServiceDefLoader;
    this.randomNumberGenerator = rng || randomNumberGenerator({});
    this.loadServices();
    this.faker = new UnmockFaker({ serviceStore: this.serviceStore });
  }

  public get services(): ServiceStoreType {
    return this.serviceStore.services;
  }

  /**
   * Start the interceptor.
   *
   * @param options
   *
   */
  public initialize(options: IUnmockOptions) {
    if (process.env.NODE_ENV === "production" && !options.useInProduction()) {
      throw new Error("Are you trying to run unmock in production?");
    }

    if (this.interceptor) {
      this.interceptor.disable();
      this.interceptor = undefined;
    }

    /**
     * Backward compatibility: Allow setting options at run-time when initializing unmock.
     */
    this.faker.setOptions(options);

    this.handleRequest = buildRequestHandler((req: ISerializedRequest) =>
      this.faker.createResponse(req),
    );

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
    this.serviceStore.resetServices();
  }

  public loadServices(): void {
    const serviceDefs = this.serviceDefLoader.loadSync();
    this.updateServiceDefs(serviceDefs);
  }

  protected updateServiceDefs(serviceDefs: IServiceDef[]) {
    const coreServices: IServiceCore[] = serviceDefs.map(serviceDef =>
      ServiceParser.parse(serviceDef),
    );

    this.serviceStore.update(coreServices);
  }
}

export default Backend;
