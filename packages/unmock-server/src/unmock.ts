import debug from "debug";
import { OnSerializedRequest, UnmockPackage } from "unmock-core";
import {
  IInterceptorFactory,
  IInterceptorOptions,
} from "unmock-core/dist/interceptor";
import { NodeBackend } from "unmock-node";

const debugLog = debug("unmock-server:algo");

export const createUnmockAlgo = ({
  servicesDirectory,
}: {
  servicesDirectory?: string;
}) => {
  const algo: { onSerializedRequest?: OnSerializedRequest } = {
    onSerializedRequest: undefined,
  };
  // Uglyish hack to access onSerializedRequest
  const interceptorFactory: IInterceptorFactory = (
    options: IInterceptorOptions,
  ) => {
    algo.onSerializedRequest = options.onSerializedRequest;
    return {
      disable() {
        algo.onSerializedRequest = undefined;
      },
    };
  };

  debugLog(`Building backend with services directory: ${servicesDirectory}`);
  const backend = new NodeBackend({ interceptorFactory, servicesDirectory });
  const unmock = new UnmockPackage(backend);
  unmock.on();
  unmock.randomize.on(); // To not always return the same mock
  return { unmock, algo };
};
