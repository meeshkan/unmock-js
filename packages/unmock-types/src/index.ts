/**
 * Interceptor callback. Called after request is serialized with
 * (1) serialized request, (2) function for sending serialized response,
 * (3) a function for emitting an error.
 */
export type OnSerializedRequest = (
  serializedRequest: ISerializedRequest,
  sendResponse: (res: ISerializedResponse) => void,
  emitError: (e: Error) => void,
) => void;

const RESTMethodTypes = [
  "get",
  "head",
  "post",
  "put",
  "patch",
  "delete",
  "options",
  "trace",
] as const;

export type HTTPMethod = typeof RESTMethodTypes[number];

/**
 * Analogous to `IncomingHttpHeaders` in @types/node.
 * Header keys are expected to be _lowercased_.
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

export interface IIncomingQuery {
  [key: string]: string | string[] | undefined;
}

export type IProtocol = "http" | "https";

export interface ISerializedRequest {
  body?: string;
  bodyAsJson?: any;
  headers: IIncomingHeaders;
  host: string;
  method: HTTPMethod;
  /**
   * Full path containing query parameters
   */
  path: string;
  /**
   * Path name not containing query parameters
   */
  pathname: string;
  /**
   * Query parameters
   */
  query: IIncomingQuery;
  protocol: IProtocol;
}

export interface ISerializedResponse {
  bodyAsJson?: any;
  body?: string;
  headers: IOutgoingHeaders;
  statusCode: number;
}

export type CreateResponse = (
  request: ISerializedRequest,
) => ISerializedResponse;
