// Sinon for asserts and matchers
import * as sinon from "sinon";
import NodeBackend from "./backend";
import { ILogger, IUnmockOptions, IUnmockPackage, IRunnerOptions } from "./interfaces";
import WinstonLogger from "./loggers/winston-logger";
import runner from "./runner";
import { AllowedHosts, BooleanSetting } from "./settings";

export { runner };
export * from "./types";
export { sinon };
export { default as dsl } from "./service/state/transformers";

const defaultRunnerOptions: IRunnerOptions = {
  maxLoop: 20,
  seed: 0,
};

export class UnmockPackage implements IUnmockPackage {
  public allowedHosts: AllowedHosts;
  public runnerOptions: Partial<IRunnerOptions> = {};
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
      runnerOptions: {
        ...defaultRunnerOptions,
        ...this.runnerOptions,
      },
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
