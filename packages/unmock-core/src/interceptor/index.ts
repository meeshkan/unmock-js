import { ISerializedRequest, ISerializedResponse } from "../interfaces";
import NodeInterceptorConstructor from "./node-interceptor";
export * from "./node-interceptor";

export interface IInterceptorListener {
  createResponse(request: ISerializedRequest): ISerializedResponse | undefined;
}

export interface IInterceptorOptions {
  listener: IInterceptorListener;
  shouldBypassHost: (host: string) => boolean;
}

export type IInterceptorConstructor = new (
  options: IInterceptorOptions,
) => IInterceptor;

export interface IInterceptor {
  disable(): void;
}

export function createInterceptor(options: IInterceptorOptions): IInterceptor {
  return new NodeInterceptorConstructor(options);
}
