import { ISerializedRequest, ISerializedResponse } from "../interfaces";
import NodeInterceptorConstructor from "./node-interceptor";

export interface IInterceptorListener {
  createResponse(request: ISerializedRequest): ISerializedResponse | undefined;
}

export interface IInterceptorOptions {
  listener: IInterceptorListener;
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
  return new NodeInterceptorConstructor(options);
}
