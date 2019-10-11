import { OnSerializedRequest } from "../interfaces";
import NodeInterceptor from "./node-interceptor";

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
