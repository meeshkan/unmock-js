import { UnmockOptions } from "./options";

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
  initialize: (opts: UnmockOptions) => void;
  reset: () => void;
}

export interface IUnmockOptions {
  logger?: ILogger;
  signature?: string;
  whitelist?: string[] | string;
  useInProduction?: boolean;
}

// Similar to `HttpIncomingHeaders` in Node.js
export interface IIncomingHeaders {
  [header: string]: string | string[] | undefined;
}

// Similar to `HttpOutgoingHeaders` in Node.js, allows numbers as they are
// converted to strings internally
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
