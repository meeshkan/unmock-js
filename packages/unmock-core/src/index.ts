import { escapeRegExp } from "lodash";
import { IBackend, ILogger, IUnmockPackage } from "./interfaces";
import * as transformers from "./service/state/transformers";
// top-level exports
export * from "./interfaces";
export * from "./generator";
export const dsl = transformers;

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

export abstract class CorePackage implements IUnmockPackage {
  protected readonly backend: IBackend;
  private logger: ILogger = { log: () => undefined }; // Default logger does nothing
  private whitelist: Array<string | RegExp> = [
    "127.0.0.1",
    "127.0.0.0",
    "localhost",
  ];
  private regexWhitelist: RegExp[];
  private useInProduction: boolean = false;

  constructor(
    backend: IBackend,
    options?: {
      logger?: ILogger;
      whitelist?: string[] | string;
      useInProduction?: boolean;
    },
  ) {
    this.whitelist =
      options && options.whitelist
        ? Array.isArray(options.whitelist)
          ? options.whitelist
          : [options.whitelist]
        : this.whitelist;
    this.regexWhitelist = whitelistToRegex(this.whitelist);

    this.backend = backend;
    this.logger = (options && options.logger) || this.logger;
    this.useInProduction =
      (options && options.useInProduction) || this.useInProduction;
  }

  public on() {
    return this.backend.initialize({
      useInProduction: this.useInProduction,
      isWhitelisted: (url: string) => this.isWhitelisted(url),
      log: (message: string) => this.logger.log(message),
    });
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

  public setAllowedHosts(urls: Array<string | RegExp> | string | RegExp): void {
    this.whitelist = Array.isArray(urls) ? urls : [urls];
    this.regexWhitelist = whitelistToRegex(this.whitelist);
  }
  public extendAllowedHosts(
    urls: string | RegExp | Array<string | RegExp>,
  ): void {
    Array.isArray(urls)
      ? this.whitelist.push(...urls)
      : this.whitelist.push(urls);
    this.regexWhitelist = whitelistToRegex(this.whitelist);
  }
  public getAllowedHosts() {
    return this.whitelist.map((url: string | RegExp) =>
      url instanceof RegExp ? url.source : url,
    );
  }
  public isWhitelisted(host: string) {
    return this.regexWhitelist.filter(wl => wl.test(host)).length > 0;
  }

  public abstract states(): any;
}
