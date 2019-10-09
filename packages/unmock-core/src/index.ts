// Sinon for asserts and matchers
import * as fetch from "node-fetch";
import * as sinon from "sinon";
import NodeBackend from "./backend/node";
import { ILogger, IUnmockOptions, IUnmockPackage } from "./interfaces";
import FsSnapshotter, { ISnapshot } from "./loggers/snapshotter";
import WinstonLogger from "./loggers/winston-logger";
import { ExtendedJSONSchema, nockify, vanillaJSONSchemify } from "./nock";
import internalRunner, { IRunnerOptions } from "./runner";
import { AllowedHosts, BooleanSetting } from "./settings";

export { fetch };
export * from "./types";
export { sinon };
export { u } from "./nock";
export { transform, Addl, Arr } from "./generator-utils";

export { ISnapshot };
const utils = { snapshotter: FsSnapshotter };
export { utils };

export class UnmockPackage implements IUnmockPackage {
  public allowedHosts: AllowedHosts;
  public flaky: BooleanSetting;
  public useInProduction: BooleanSetting;
  protected readonly backend: NodeBackend;
  private logger: ILogger = { log: () => undefined }; // Default logger does nothing
  constructor(
    backend: NodeBackend,
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

  public runner(fn?: jest.ProvidesCallback, options?: Partial<IRunnerOptions>) {
    const f = async (cb?: jest.DoneCallback) => {
      return internalRunner(this.backend)(fn, options)(cb);
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

export const unmock = new UnmockPackage(new NodeBackend(), {
  logger: new WinstonLogger(),
});

export const nock = unmock.nock.bind(unmock);
export const runner = unmock.runner.bind(unmock);

export default unmock;
