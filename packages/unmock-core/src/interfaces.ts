import { ServiceStoreType } from "./service/interfaces";
import { AllowedHosts } from "./settings/allowedHosts";

export { ServiceStoreType };

export interface ILogger {
  log(message: string): void;
}

export interface IListener {
  notify({
    req,
    res,
  }: {
    req: ISerializedRequest;
    res?: ISerializedResponse;
  }): void;
}

export interface IUnmockOptions extends ILogger {
  useInProduction(): boolean;
  isWhitelisted(url: string): boolean;
  flaky(): boolean;
}

export interface IBackend {
  readonly services: ServiceStoreType;
  initialize(options: IUnmockOptions): void;
  reset(): void;
}

export interface IUnmockPackage {
  allowedHosts: AllowedHosts;
  services: ServiceStoreType;
  on(): IUnmockPackage;
  init(): IUnmockPackage;
  initialize(): IUnmockPackage;
  off(): void;
}

/**
 * Analogous to `IncomingHttpHeaders` in @types/node.
 * Header names are expected to be _lowercased_.
 */
export interface IIncomingHeaders {
  [header: string]: string | string[] | undefined;
}

/**
 * Analogous to `OutgoingHttpHeaders` in @types/node.
 * Allows numbers as they are converted to strings internally.
 */
export interface IOutgoingHeaders {
  [header: string]: string | string[] | number | undefined;
}

export interface ISerializedRequest {
  body?: string | object;
  headers?: IIncomingHeaders;
  host: string;
  method: string;
  path: string;
  protocol: "http" | "https";
}

export interface ISerializedResponse {
  body?: string;
  headers?: IOutgoingHeaders;
  statusCode: number;
}

export type CreateResponse = (
  request: ISerializedRequest,
) => ISerializedResponse | undefined;

export interface IServiceDefFile {
  /**
   * Basename for the service definition file: for example, `index.yaml`.
   */
  basename: string;
  /**
   * Contents of the service definition file
   */
  contents: string | Buffer;
}

/**
 * Input to the service parser. Contains, e.g., the directory name and all available files.
 */
export interface IServiceDef {
  /**
   * Absolute path to the service directory
   */
  absolutePath: string;

  /**
   * Name of the service directory: for example, `petstore`.
   */

  directoryName: string;
  /**
   * All the files defining the service.
   */
  serviceFiles: IServiceDefFile[];
}
