import {
  IBackend,
  ILogger,
  IUnmockOptions,
  IUnmockPackage,
} from "./interfaces";
import * as transformers from "./service/state/transformers";
import { AllowedHosts, BooleanSetting } from "./settings";
export * from "./types";
// Sinon for asserts and matchers
import sinon from "sinon";
import NodeBackend from "./backend";
import WinstonLogger from "./loggers/winston-logger";
export { sinon };
// TODO: temporary exports while migrating to new package structure
export { IServiceDef, ISerializedRequest, IBackend } from "./interfaces";
export { IService } from "./service/interfaces";
export { responseCreatorFactory } from "./generator";

export const dsl = transformers;

export class UnmockPackage implements IUnmockPackage {
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

const unmock: IUnmockPackage = new UnmockPackage(new NodeBackend(), {
  logger: new WinstonLogger(),
});

export type UnmockNode = typeof unmock;

export default unmock;
