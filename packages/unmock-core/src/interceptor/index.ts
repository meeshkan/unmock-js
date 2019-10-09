import { ISerializedRequest, ISerializedResponse } from "../interfaces";
import NodeInterceptor from "./node-interceptor";

export type HandleRequest = (
  serializedRequest: ISerializedRequest,
  sendResponse: (res: ISerializedResponse) => void,
  emitError: (e: Error) => void,
) => void;

export interface IInterceptorOptions {
  handleRequest: HandleRequest;
  shouldBypassHost: (host: string) => boolean;
}

/**
 * Create interceptor and start intercepting requests.
 * @param options
 */
export type IInterceptorConstructor = new (
  options: IInterceptorOptions,
) => IInterceptor;

/**
 * Active interceptor.
 */
export interface IInterceptor {
  disable(): void;
}

/**
 * Create an interceptor and start intercepting requests.
 * @param options
 */
export function createInterceptor(options: IInterceptorOptions): IInterceptor {
  return new NodeInterceptor(options);
}
