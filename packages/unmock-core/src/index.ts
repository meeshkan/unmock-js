import { escapeRegExp } from "lodash";
import {
  IAllowedHosts,
  IBackend,
  ILogger,
  IUnmockOptions,
  IUnmockPackage,
} from "./interfaces";
import * as transformers from "./service/state/transformers";
// top-level exports
export * from "./interfaces";
export * from "./generator";
export const dsl = transformers;

// tslint:disable: max-classes-per-file
// Classes in this file to avoid unnecessary imports/exports

const whitelistToRegex = (whitelist?: Array<string | RegExp>): RegExp[] =>
  whitelist === undefined
    ? []
    : whitelist.map((item: any) =>
        item instanceof RegExp
          ? item
          : new RegExp(
              `^${item
                .split(/\*+/)
                .map(escapeRegExp)
                .join(".*")}$`,
            ),
      );

interface IBooleanSetting {
  on(): void;
  off(): void;
  get(): boolean;
}

class BooleanSetting implements IBooleanSetting {
  constructor(private value = false) {}
  public on() {
    this.value = true;
  }
  public off() {
    this.value = false;
  }
  public get() {
    return this.value;
  }
}

class AllowedHosts implements IAllowedHosts {
  constructor(
    private whitelist: Array<string | RegExp> = [
      "127.0.0.1",
      "127.0.0.0",
      "localhost",
    ],
    private regexWhitelist = whitelistToRegex(whitelist),
  ) {}

  public set(urls: Array<string | RegExp> | string | RegExp): void {
    this.whitelist = Array.isArray(urls) ? urls : [urls];
    this.regexWhitelist = whitelistToRegex(this.whitelist);
  }
  public add(urls: string | RegExp | Array<string | RegExp>): void {
    Array.isArray(urls)
      ? this.whitelist.push(...urls)
      : this.whitelist.push(urls);
    this.regexWhitelist = whitelistToRegex(this.whitelist);
  }
  public get() {
    return this.whitelist.map((url: string | RegExp) =>
      url instanceof RegExp ? url.source : url,
    );
  }
  public isWhitelisted(host: string) {
    return this.regexWhitelist.filter(wl => wl.test(host)).length > 0;
  }
}

export abstract class CorePackage implements IUnmockPackage {
  public allowedHosts: IAllowedHosts;
  public flaky: IBooleanSetting;
  public useInProduction: IBooleanSetting;

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
    this.on();
  }
  public initialize() {
    this.on();
  }

  public off() {
    this.backend.reset();
  }

  public abstract states(): any;
}
