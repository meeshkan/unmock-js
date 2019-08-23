import {
  IBackend,
  ILogger,
  IUnmockOptions,
  IUnmockPackage,
} from "./interfaces";
import * as transformers from "./service/state/transformers";
import { AllowedHosts, BooleanSetting } from "./settings";

export {
  ISerializedRequest as Request,
  ISerializedRequest as UnmockRequest,
  ISerializedResponse as UnmockResponse,
  ServiceStoreType as UnmockServices,
} from "./interfaces";
export {
  IService as UnmockService,
  IService as Service,
} from "./service/interfaces";

import sinon from "sinon";
export { sinon };

export const dsl = transformers;

export class CorePackage implements IUnmockPackage {
  public allowedHosts: AllowedHosts;
  public flaky: BooleanSetting;
  public useInProduction: BooleanSetting;
  protected readonly backend: IBackend;
  private logger: ILogger = { log: () => undefined }; // Default logger does nothing

  constructor(
    backend: IBackend,
    options?: {
      logger?: ILogger;
    },
  ) {
    this.backend = backend;
    this.logger = (options && options.logger) || this.logger;

    this.allowedHosts = new AllowedHosts();
    this.flaky = new BooleanSetting();
    this.useInProduction = new BooleanSetting();
  }

  public on() {
    const opts: IUnmockOptions = {
      useInProduction: () => this.useInProduction.get(),
      isWhitelisted: (url: string) => this.allowedHosts.isWhitelisted(url),
      log: (message: string) => this.logger.log(message),
      flaky: () => this.flaky.get(),
    };
    this.backend.initialize(opts);
    return this;
  }
  public init() {
    return this.on();
  }
  public initialize() {
    return this.on();
  }

  public off() {
    this.backend.reset();
  }

  public get services() {
    return this.backend.services;
  }
}
