import { OnSerializedRequest } from "../interfaces";

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
