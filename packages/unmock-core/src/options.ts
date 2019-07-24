import { escapeRegExp } from "lodash";
import { ILogger, IUnmockOptions } from "./interfaces";

export class UnmockOptions implements IUnmockOptions {
  public useInProduction: boolean = false;
  // public logger: ILogger = { log: () => undefined }; // Default logger does nothing
  // public signature?: string;
  public whitelist?: string[] | string;
  private regexWhitelist?: RegExp[];

  constructor(options?: IUnmockOptions) {
    this.reset(options); // Save internally
    this.whitelist = this.whitelist || ["127.0.0.1", "127.0.0.0", "localhost"];
    this.regexWhitelist = this.whitelistToRegex(this.whitelist);
  }

  public reset(options?: IUnmockOptions): UnmockOptions {
    if (options === undefined) {
      return this;
    }
    const { whitelist, useInProduction } = options;
    // this.logger = logger || this.logger;
    // this.signature = signature || this.signature;
    this.whitelist = whitelist ? whitelist : this.whitelist;
    this.regexWhitelist = this.whitelistToRegex(this.whitelist);
    this.useInProduction = useInProduction || this.useInProduction;

    return this;
  }

  public isWhitelisted(host: string) {
    if (this.regexWhitelist === undefined) {
      return false;
    }
    return this.regexWhitelist.filter(wl => wl.test(host)).length > 0;
  }

  private whitelistToRegex(whitelist?: string[] | string): RegExp[] {
    if (whitelist === undefined) {
      return [];
    }
    whitelist = whitelist instanceof Array ? whitelist : [whitelist];
    return whitelist.map((item: any) => {
      if (item instanceof RegExp) {
        return item;
      }
      return new RegExp(
        "^" +
          item
            .split(/\*+/)
            .map(escapeRegExp)
            .join(".*") +
          "$",
      );
    });
  }
}
