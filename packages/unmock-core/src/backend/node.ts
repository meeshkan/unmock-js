import NodeInterceptorConstructor from "../interceptor/node-interceptor";
import { IServiceDef } from "../interfaces";
import FSLogger from "../loggers/filesystem-logger";
import FSSnapshotter from "../loggers/snapshotter";
import createFsServiceDefLoader from "../service-loaders";
import Backend from "./";

export interface INodeBackendOptions {
  servicesDirectory?: string;
}

/**
 * Node.js backend. Uses Node.js interceptor and loads services from the
 * filesystem at construction.
 */
export default class NodeBackend extends Backend {
  private readonly servicesDirectory?: string;
  public constructor(config?: INodeBackendOptions) {
    const servicesDirectory = config && config.servicesDirectory;
    const listeners = [
      new FSLogger({
        directory: servicesDirectory,
      }),
      FSSnapshotter.getOrUpdateSnapshotter({}),
    ];
    super({
      InterceptorCls: NodeInterceptorConstructor,
      listeners,
    });
    this.servicesDirectory = config && config.servicesDirectory;
    this.loadServices();
  }

  public loadServices() {
    const serviceDefLoader = createFsServiceDefLoader(this.servicesDirectory);
    const serviceDefs: IServiceDef[] = serviceDefLoader.loadSync();
    this.updateServiceDefs(serviceDefs);
  }
}
