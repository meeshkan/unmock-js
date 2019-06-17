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

interface IHeaders {
  [key: string]: string;
}

export interface ISerializedRequest {
  body?: string;
  headers?: IHeaders;
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
  headers?: IHeaders;
  statusCode: number;
}

export interface IMock {
  request: IMockRequest;
  response: ISerializedResponse;
}
