import {
  IBackend,
  ILogger,
  IUnmockOptions,
  IUnmockPackage,
} from "./interfaces";
import * as transformers from "./service/state/transformers";
import { AllowedHosts, BooleanSetting } from "./settings";
// top-level exports
export * from "./interfaces";
export * from "./generator";
export {
  default as unmockConsole,
  CustomConsole as UnmockConsole,
} from "./console";

import { StateFacadeType } from "./service/interfaces";
export type States = StateFacadeType;

export const dsl = transformers;

export abstract class CorePackage implements IUnmockPackage {
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
    return this.backend.initialize(opts);
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

  public abstract states(): States | undefined;
}
