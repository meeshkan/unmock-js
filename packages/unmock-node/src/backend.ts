import { Backend } from "unmock-core";
import { IServiceDef } from "unmock-core/dist/interfaces";
import createFsServiceDefLoader from "./fs-service-def-loader";
import NodeInterceptorConstructor from "./interceptor/node-interceptor";
import FSLogger from "./loggers/filesystem-logger";
import FSSnapshotter from "./loggers/snapshotter";

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
