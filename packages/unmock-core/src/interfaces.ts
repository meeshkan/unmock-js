import { UnmockOptions } from "./options";
import { IService } from "./service/interfaces";

export interface ILogger {
  log: (message: string) => void;
}

export interface IMetaData {
  lang?: string;
}

export interface IRequestData {
  body?: string;
  headers?: any;
  host?: string;
  method?: string;
  path?: string;
}

export interface IResponseData {
  body?: string;
  headers?: any;
}

export interface IBackend {
  initialize: (opts: UnmockOptions) => any;
  reset: () => void;
}

export interface IUnmockOptions {
  logger?: ILogger;
  signature?: string;
  whitelist?: string[] | string;
  useInProduction?: boolean;
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
  body?: string;
  headers?: IIncomingHeaders;
  host: string;
  method: string;
  path: string;
  protocol: "http" | "https";
}

export type IMockRequest = {
  [P in keyof ISerializedRequest]?: ISerializedRequest[P] | RegExp;
};

export interface ISerializedResponse {
  body?: string;
  headers?: IOutgoingHeaders;
  statusCode: number;
}

export interface IMock {
  request: IMockRequest;
  response: ISerializedResponse;
}

export type CreateResponse = (
  request: ISerializedRequest,
) => ISerializedResponse | undefined;

// Used to load a service specification from a serialized request
// Returns an object (parsed from specification)
export type RequestToSpec = (sreq: ISerializedRequest) => any;
export type GeneratedMock = any;

export interface IServiceDefLoader {
  /**
   * Asynchronously read service definitions.
   */
  load(): Promise<IServiceDef[]>;
  /**
   * Synchronously read service definitions.
   */
  loadSync(): IServiceDef[];
}

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

export interface IServiceParser {
  parse(serviceDef: IServiceDef): IService;
}
