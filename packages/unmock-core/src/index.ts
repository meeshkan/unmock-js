// Sinon for asserts and matchers
import * as sinon from "sinon";
import Backend, { buildRequestHandler } from "./backend";
import { ILogger, IUnmockOptions, IUnmockPackage } from "./interfaces";
import { ExtendedJSONSchema, nockify, vanillaJSONSchemify } from "./nock";
import {
  IRandomNumberGenerator,
  randomNumberGenerator,
} from "./random-number-generator";
import internalRunner, { IRunnerOptions } from "./runner";
import { AllowedHosts, BooleanSetting, IBooleanSetting } from "./settings";

export * from "./interfaces";
export * from "./types";
export { sinon };
export { u } from "./nock";
export { transform, Addl, Arr } from "./generator-utils";
export { IService } from "./service/interfaces";
export { ServiceCore } from "./service/serviceCore";
export { Backend, buildRequestHandler };

export class UnmockPackage implements IUnmockPackage {
  public allowedHosts: AllowedHosts;
  public useInProduction: BooleanSetting;
  public randomNumberGenerator: IRandomNumberGenerator;
  /**
   * Always return a new randomized response instead of using a fixed seed.
   */
  public randomize: IBooleanSetting;
  public readonly backend: Backend;
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

    const rng = randomNumberGenerator({ seed: 0 });
    this.randomNumberGenerator = rng;
    this.randomize = new BooleanSetting(false);
  }

  public on() {
    const opts: IUnmockOptions = {
      useInProduction: () => this.useInProduction.get(),
      isWhitelisted: (url: string) => this.allowedHosts.isWhitelisted(url),
      log: (message: string) => this.logger.log(message),
      randomize: () => this.randomize.get(),
    };
    this.backend.initialize(opts, this.randomNumberGenerator);
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
      return internalRunner(this.backend, this.randomNumberGenerator)(
        fn,
        options,
      )(cb);
    };
    return f;
  }

  public nock(
    baseUrl: string,
    nameOrHeaders?:
      | string
      | { reqheaders?: Record<string, ExtendedJSONSchema> },
    name?: string,
  ) {
    const internalName =
      typeof nameOrHeaders === "string"
        ? nameOrHeaders
        : typeof name === "string"
        ? name
        : undefined;
    const requestHeaders =
      typeof nameOrHeaders === "object" && nameOrHeaders.reqheaders
        ? Object.entries(nameOrHeaders.reqheaders).reduce(
            (a, b) => ({ ...a, [b[0]]: vanillaJSONSchemify(b[1]) }),
            {},
          )
        : {};
    return nockify({
      backend: this.backend,
      baseUrl,
      requestHeaders,
      name: internalName,
    });
  }

  public associate(url: string, name: string) {
    this.backend.serviceStore.updateOrAdd({ baseUrl: url, name });
  }

  public reloadServices() {
    this.backend.loadServices();
  }

  public reset() {
    Object.values(this.backend.services).forEach(service => service.reset());
  }
}
