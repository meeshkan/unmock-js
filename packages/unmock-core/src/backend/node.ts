import NodeInterceptorConstructor from "../interceptor/node-interceptor";
import Backend, { INodeBackendOptions } from "./";
const nodeBackendDefaultOptions: INodeBackendOptions = {};

export default class NodeBackend extends Backend {
  public constructor(config?: INodeBackendOptions) {
    const resolvedConfig = { ...nodeBackendDefaultOptions, ...config };
    super({
      config: resolvedConfig,
      interceptorConstructor: NodeInterceptorConstructor,
    });
  }
}
