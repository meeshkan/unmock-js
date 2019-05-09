import { escapeRegExp, isEmpty } from "lodash";
import { ActionsV0 } from "unmock-hash";
import { DEFAULT_IGNORE_HEADER, UNMOCK_HOST, UNMOCK_PORT } from "./constants";
import { ILogger, IPersistence, IUnmockOptions } from "./interfaces";
import { FailingPersistence } from "./persistence";

export enum Mode {
  ALWAYS_CALL_UNMOCK,
  CALL_UNMOCK_FOR_NEW_MOCKS,
  DO_NOT_CALL_UNMOCK,
}

export class UnmockOptions implements IUnmockOptions {
  public save: boolean | string[] = true;
  public actions: ActionsV0[] = [
    "deserialize-json-body",
    "deserialize-x-www-form-urlencoded-body",
    "make-header-keys-lowercase",
  ];
  public unmockHost: string = UNMOCK_HOST;
  public unmockPort: string = UNMOCK_PORT;
  public useInProduction: boolean = false;
  public mode: Mode = Mode.CALL_UNMOCK_FOR_NEW_MOCKS;
  public persistence: IPersistence = new FailingPersistence();
  public logger: ILogger = { log: () => undefined }; // Default logger does nothing
  public signature?: string;
  public whitelist?: string[] | string;
  private regexWhitelist?: RegExp[];
  private internalIgnore: any = DEFAULT_IGNORE_HEADER;
  private refreshToken?: string;

  constructor(options?: IUnmockOptions) {
    this.reset(options); // Save internally
    this.whitelist = this.whitelist || [
      "127.0.0.1",
      "127.0.0.0",
      "localhost",
      this.unmockHost,
    ];
    this.regexWhitelist = this.whitelistToRegex(this.whitelist);
  }

  public reset(options?: IUnmockOptions): UnmockOptions {
    if (options === undefined) {
      return this;
    }
    const {
      actions,
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
    this.actions = actions || this.actions;
    this.unmockHost = unmockHost || this.unmockHost;
    this.unmockPort = unmockPort || this.unmockPort;
    this.internalIgnore = ignore || this.internalIgnore;
    this.signature = signature || this.signature;
    this.refreshToken = token || this.refreshToken;
    this.whitelist = whitelist ? whitelist : this.whitelist;
    this.regexWhitelist = this.whitelistToRegex(this.whitelist);
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

  public buildPath(...args: string[]) {
    const base = `https://${this.unmockHost}:${this.unmockPort}`;
    if (args.length === 0) {
      return base;
    }
    const maybeSlash = args[0].startsWith("/") ? "" : "/";
    return `${base}${maybeSlash}${args.join("/")}`;
  }

  public isWhitelisted(host: string) {
    if (this.regexWhitelist === undefined) {
      return false;
    }
    return this.regexWhitelist.filter((wl) => wl.test(host)).length > 0;
  }

  public shouldMakeNetworkCall(hash: string) {
    return (
      this.mode === Mode.ALWAYS_CALL_UNMOCK ||
      (this.mode === Mode.CALL_UNMOCK_FOR_NEW_MOCKS &&
        !this.persistence.hasHash(hash))
    );
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
