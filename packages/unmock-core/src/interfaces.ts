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
export interface IResponseCreatorFactoryInput {
  mockGenerator: () => IMock[];
}

// export interface IUnmockRule {
//   // Describes a rule within unmock response generation
//   // A rule can either be:
//   // 1. Setting a specific key to a specific value (in a hierarchical, object
//   //     notation, i.e. "username: { friends: { login: { ... } } }")
//   // 2. A DSL-specific notation (i.e. $size, $override, $jsf, etc)
//   // 3. A composition (object/array) of other rules
// }
