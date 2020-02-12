import { Backend, IInterceptorFactory, IInterceptorOptions } from "unmock-core";
import createFsServiceDefLoader from "./fs-service-def-loader";
import NodeInterceptor from "./interceptor/node-interceptor";
import FSLogger from "./loggers/filesystem-logger";
import FSSnapshotter from "./loggers/snapshotter";

export interface INodeBackendOptions {
  servicesDirectory?: string;
  interceptorFactory?: IInterceptorFactory;
}

/**
 * Node.js backend. Uses Node.js interceptor and loads services from the
 * filesystem at construction.
 */
export default class NodeBackend extends Backend {
  public constructor(config?: INodeBackendOptions) {
    const servicesDirectory = config && config.servicesDirectory;
    const listeners = [
      new FSLogger({
        directory: servicesDirectory,
      }),
      FSSnapshotter.getOrUpdateSnapshotter({}),
    ];
    const interceptorFactory =
      (config && config.interceptorFactory) ||
      ((options: IInterceptorOptions) => new NodeInterceptor(options));
    const serviceDefLoader = createFsServiceDefLoader(servicesDirectory);
    super({
      interceptorFactory,
      listeners,
      serviceDefLoader,
    });
  }
}
