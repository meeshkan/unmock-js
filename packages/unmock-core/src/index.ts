// Sinon for asserts and matchers
import * as sinon from "sinon";
import Backend, { buildRequestHandler } from "./backend";
import UnmockFaker from "./faker";
import { ILogger, IUnmockOptions, IUnmockPackage } from "./interfaces";
import internalRunner, { IRunnerOptions } from "./runner";
import { addFromNock, NockAPI, ServiceStore } from "./service/serviceStore";
import { AllowedHosts, BooleanSetting, IBooleanSetting } from "./settings";
import * as typeUtils from "./utils";

export * from "./interfaces";
export * from "./types";
export { sinon };
export { u } from "./nock";
export { transform, Addl, Arr } from "./generator-utils";
export { IService } from "./service/interfaces";
export { ServiceCore } from "./service/serviceCore";
export { Backend, buildRequestHandler };
export { typeUtils };
export { UnmockFaker };

export class UnmockPackage implements IUnmockPackage {
  public allowedHosts: AllowedHosts;
  public useInProduction: BooleanSetting;
  /**
   * Always return a new randomized response instead of using a fixed seed.
   */
  public randomize: IBooleanSetting;
  public readonly backend: Backend;
  public readonly nock: NockAPI;
  private readonly opts: IUnmockOptions;
  private logger: ILogger = { log: () => undefined }; // Default logger does nothing
  constructor(
    backend: Backend,
    options?: {
      logger?: ILogger;
    },
  ) {
    this.backend = backend;
    this.logger = (options && options.logger) || this.logger;

    this.allowedHosts = new AllowedHosts();
    this.useInProduction = new BooleanSetting(false);
    this.randomize = new BooleanSetting(false);
    this.opts = {
      useInProduction: () => this.useInProduction.get(),
      isWhitelisted: (url: string) => this.allowedHosts.isWhitelisted(url),
      log: (message: string) => this.logger.log(message),
      randomize: () => this.randomize.get(),
    };
    this.nock = addFromNock(this.backend.serviceStore);
  }

  public faker(): UnmockFaker {
    return new UnmockFaker({ serviceStore: new ServiceStore([]) });
  }

  public on() {
    this.backend.initialize(this.opts);
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

  public runner(fn?: jest.ProvidesCallback, options?: Partial<IRunnerOptions>) {
    const f = async (cb?: jest.DoneCallback) => {
      return internalRunner(this.backend)(fn, options)(cb);
    };
    return f;
  }

  public associate(url: string, name: string) {
    this.backend.serviceStore.updateOrAdd({ baseUrl: url, name });
  }

  public reloadServices() {
    this.backend.loadServices();
  }

  public reset() {
    this.backend.serviceStore.resetServices();
  }
}
