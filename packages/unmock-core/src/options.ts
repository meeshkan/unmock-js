import { escapeRegExp, isEmpty } from "lodash";
import { DEFAULT_IGNORE_HEADER, UNMOCK_HOST, UNMOCK_PORT } from "./constants";
import { ILogger, IPersistence, IUnmockOptions } from "./interfaces";
import { FailingPersistence } from "./persistence";
import getToken from "./token";

export enum Mode {
  ALWAYS_CALL_UNMOCK,
  CALL_UNMOCK_FOR_NEW_MOCKS,
  DO_NOT_CALL_UNMOCK,
}

export class UnmockOptions {
  public save: boolean | string[] = true;
  public unmockHost: string = UNMOCK_HOST;
  public unmockPort: string = UNMOCK_PORT;
  public useInProduction: boolean = false;
  public mode: Mode = Mode.CALL_UNMOCK_FOR_NEW_MOCKS;
  public persistence: IPersistence = new FailingPersistence();
  public logger: ILogger = { log: () => undefined }; // Default logger does nothing
  public signature?: string;
  public whitelist?: RegExp[];
  private internalIgnore: any = DEFAULT_IGNORE_HEADER;
  private refreshToken?: string;

  constructor(options?: IUnmockOptions) {
    this.reset(options); // Save internally
    this.whitelist =
      this.whitelist ||
      this.whitelistToRegex([
        "127.0.0.1",
        "127.0.0.0",
        "localhost",
        this.unmockHost,
      ]);
  }

  public reset(options?: IUnmockOptions): UnmockOptions {
    if (options === undefined) {
      return this;
    }
    const {
      logger,
      persistence,
      save,
      unmockHost,
      unmockPort,
      ignore,
      signature,
      token,
      whitelist,
      useInProduction,
      mode,
    } = options;
    this.logger = logger || this.logger;
    this.persistence = persistence || this.persistence;
    this.save = save || this.save;
    this.unmockHost = unmockHost || this.unmockHost;
    this.unmockPort = unmockPort || this.unmockPort;
    this.internalIgnore = ignore || this.internalIgnore;
    this.signature = signature || this.signature;
    this.refreshToken = token || this.refreshToken;
    this.whitelist = whitelist
      ? this.whitelistToRegex(whitelist)
      : this.whitelist;
    this.useInProduction = useInProduction || this.useInProduction;
    this.mode = mode || this.mode;

    if (this.refreshToken && this.persistence) {
      this.persistence.saveToken(this.refreshToken);
    }
    return this;
  }

  public get token() {
    return this.refreshToken;
  }

  public addIgnore(ignore: any) {
    this.internalIgnore =
      this.internalIgnore instanceof Array
        ? this.internalIgnore.concat(ignore)
        : [this.internalIgnore, ignore];
  }

  public get ignore() {
    // Allows passing ignore as {} or [] on initialization
    // to override default ignore with empty ignore.
    return isEmpty(this.internalIgnore) ? undefined : this.internalIgnore;
  }

  public async getAccessToken() {
    return await getToken(this);
  }

  public buildPath(...args: string[]) {
    const base = `https://${this.unmockHost}:${this.unmockPort}`;
    if (args.length === 0) {
      return base;
    }
    const maybeSlash = args[0].startsWith("/") ? "" : "/";
    return `${base}${maybeSlash}${args.join("/")}`;
  }

  public isWhitelisted(host: string) {
    if (this.whitelist === undefined) {
      return false;
    }
    return this.whitelist.filter((wl) => wl.test(host)).length > 0;
  }

  public shouldMakeNetworkCall(hash: string) {
    return (
      this.mode === Mode.ALWAYS_CALL_UNMOCK ||
      (this.mode === Mode.CALL_UNMOCK_FOR_NEW_MOCKS &&
        !this.persistence.hasHash(hash))
    );
  }

  private whitelistToRegex(whitelist: string[] | string): RegExp[] {
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
