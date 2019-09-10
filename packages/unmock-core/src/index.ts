// Sinon for asserts and matchers
import * as sinon from "sinon";
import NodeBackend from "./backend";
import {
  ILogger,
  IUnmockOptions,
  IUnmockPackage,
  HTTPMethod,
} from "./interfaces";
import WinstonLogger from "./loggers/winston-logger";
import { AllowedHosts, BooleanSetting } from "./settings";
import { Schema } from "./service/interfaces";
import { Service } from "./service";

export * from "./types";
export { sinon };
export { default as dsl } from "./service/state/transformers";

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
}

const bknd = new NodeBackend();
const unmockPackage: IUnmockPackage = new UnmockPackage(bknd, {
  logger: new WinstonLogger(),
});

type UpdateCallback = ({
  statusCode,
  data,
}: {
  statusCode: number;
  data: Schema;
}) => Service | undefined;

const dynamicService = (baseUrl: string) => {
  const dynFn = (method: HTTPMethod, endpoint: string) => ({
    statusCode,
    data,
  }: {
    statusCode: number;
    data: Schema;
  }) =>
    bknd.updateServices({
      baseUrl,
      method,
      endpoint,
      statusCode,
      response: data,
    });

  return {
    get(endpoint: string) {
      return new DynamicServiceSpec(dynFn("get", endpoint));
    },
    head(endpoint: string) {
      return new DynamicServiceSpec(dynFn("head", endpoint));
    },
    post(endpoint: string) {
      return new DynamicServiceSpec(dynFn("post", endpoint));
    },
    put(endpoint: string) {
      return new DynamicServiceSpec(dynFn("put", endpoint));
    },
    patch(endpoint: string) {
      return new DynamicServiceSpec(dynFn("patch", endpoint));
    },
    delete(endpoint: string) {
      return new DynamicServiceSpec(dynFn("delete", endpoint));
    },
    options(endpoint: string) {
      return new DynamicServiceSpec(dynFn("options", endpoint));
    },
    trace(endpoint: string) {
      return new DynamicServiceSpec(dynFn("trace", endpoint));
    },
  };
};

// Placeholder for poet input type, to have
// e.g. standard object => { type: "object", properties: { ... }}, number => { type: "number", const: ... }
type InputToPoet = any;
// tslint:disable-next-line: max-classes-per-file
class DynamicServiceSpec {
  private statusCode: number = 200; // TODO default success statuscode per verb?
  private data: Schema = {};

  constructor(private updater: UpdateCallback) {}

  public reply(statusCode: number, data?: InputToPoet): void;
  public reply(data: InputToPoet): void;
  public reply(maybeStatusCode: number | InputToPoet, maybeData?: InputToPoet) {
    if (maybeData !== undefined) {
      this.data = maybeData as Schema; // TODO: use poet to convert to JSON Schema?
      this.statusCode = maybeStatusCode;
    } else if (
      typeof maybeStatusCode === "number" &&
      maybeStatusCode >= 100 &&
      maybeStatusCode < 599
    ) {
      // we assume it's a status code
      this.statusCode = maybeStatusCode;
    } else {
      this.data = maybeStatusCode as Schema; // TODO: ditto
    }
    return this.updater({ data: this.data, statusCode: this.statusCode });
  }
}

const unmock = Object.assign(unmockPackage, dynamicService); // Add the function call to the unmock object

export type UnmockNode = typeof unmock;

export default unmock;
