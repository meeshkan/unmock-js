import { ISerializedRequest, ISerializedResponse } from "../interfaces";
import NodeInterceptor from "./node-interceptor";

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

export interface IInterceptorOptions {
  onSerializedRequest: OnSerializedRequest;
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
