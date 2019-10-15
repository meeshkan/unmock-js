import { OnSerializedRequest, UnmockPackage } from "unmock-core";
import {
  IInterceptorFactory,
  IInterceptorOptions,
} from "unmock-core/src/interceptor";
import { NodeBackend } from "unmock-node";

export const create = () => {
  const config: { onSerializedRequest?: OnSerializedRequest } = {
    onSerializedRequest: undefined,
  };
  // Uglyish hack to access onSerializedRequest
  const interceptorFactory: IInterceptorFactory = (
    options: IInterceptorOptions,
  ) => {
    config.onSerializedRequest = options.onSerializedRequest;
    return {
      disable() {
        config.onSerializedRequest = undefined;
      },
    };
  };
  const backend = new NodeBackend({ interceptorFactory });
  // const createResponse = responseCreatorFactory(backend.serviceStore);
  const unmock = new UnmockPackage(backend);
  unmock
    .nock("https://example.com", "example")
    .get("/")
    .reply("Hello world!");
  unmock.on();
  return config;
};
