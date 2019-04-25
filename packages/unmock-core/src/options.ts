import { escapeRegExp } from "lodash";
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

  constructor(options: IUnmockOptions) {
    this.reset(options); // Save internally
    const { whitelist } = options;
    // Override with defaults if needed.
    this.whitelist = this.whitelistToRegex(
      whitelist || ["127.0.0.1", "127.0.0.0", "localhost", this.unmockHost],
    );
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
    this.whitelist = this.whitelistToRegex(whitelist) || this.whitelist;
    this.useInProduction = useInProduction || this.useInProduction;
    this.mode = mode || this.mode;

    if (this.refreshToken && this.persistence) {
      this.persistence.saveToken(this.refreshToken);
    }
    return this;
  }

  public addIgnore(ignore: any) {
    this.internalIgnore =
      this.internalIgnore instanceof Array
        ? this.internalIgnore.concat(ignore)
        : [this.internalIgnore, ignore];
  }

  public get ignore() {
    return this.internalIgnore;
  }

  public async token() {
    return await getToken(this);
  }

  public buildPath(...args: string[]) {
    const base = `https://${this.unmockHost}:${this.unmockPort}`;
    if (args.length === 0) {
      return base;
    }
    return `${base}/${args.join("/")}`;
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

  private whitelistToRegex(
    whitelist: string[] | undefined,
  ): RegExp[] | undefined {
    if (whitelist === undefined) {
      return;
    }
    return whitelist.map(
      (item) =>
        new RegExp(
          "^" +
            item
              .split(/\*+/)
              .map(escapeRegExp)
              .join(".*") +
            "$",
        ),
    );
  }
}
