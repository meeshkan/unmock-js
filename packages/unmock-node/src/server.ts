import {
  Backend,
  ISerializedRequest,
  ISerializedResponse,
  OnSerializedRequest,
} from "unmock-core";
import { IInterceptorOptions } from "unmock-core/src/interceptor";
import NodeInterceptor from "./interceptor/node-interceptor";

export interface IServerBackendOptions {
  url: string;
}

const onSerializedRequest: (
  opts: IServerBackendOptions,
) => OnSerializedRequest = (opts: IServerBackendOptions) => async (
  req: ISerializedRequest,
  sendResponse: (res: ISerializedResponse) => void,
  emitError: (e: Error) => void,
) => {
  // Send to local server
  const url = opts.url;

  const response = await fetch(url, {
    method: "post",
    body: JSON.stringify(req),
    headers: { "Content-Type": "application/json" },
  });

  if (!response.ok) {
    emitError(
      Error(
        `Failed requesting response from server, got status: ${response.status}`,
      ),
    );
    return;
  }

  const res = (await response.json()) as ISerializedResponse;

  sendResponse(res);
};

/**
 * Server backend. Uses Node.js interceptor and sends requests to the server
 */
export default class ServerBackend extends Backend {
  public constructor(config: IServerBackendOptions) {
    super({
      interceptorFactory: (options: IInterceptorOptions) => {
        const opts = {
          ...options,
          // UGLY OVERRIDE, allow injecting this to super
          onSerializedRequest: onSerializedRequest(config),
        };
        return new NodeInterceptor(opts);
      },
      listeners: [],
    });
  }

  public loadServices() {} // tslint:disable-line
}
