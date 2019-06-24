import { DEFAULT_ENDPOINT, DEFAULT_REST_METHOD } from "./constants";
import {
  HTTPMethod,
  IOASMappingGenerator,
  isRESTMethod,
  IUnmockServiceState,
  ServiceMapping,
} from "./interfaces";
import { Service } from "./service";

export class ServiceStore {
  private serviceMapping: ServiceMapping = {};

  constructor(servicePopulator: IOASMappingGenerator) {
    const services = servicePopulator();
    Object.keys(services).forEach(k => {
      this.serviceMapping[k] = new Service(services[k]);
    });
  }

  public __saveState({
    serviceName: service,
    method,
    endpoint,
    state,
  }: {
    serviceName: string;
    endpoint: string;
    method: HTTPMethod;
    state: IUnmockServiceState;
  }) {
    /**
     * Verifies logical flow of inputs before dispatching the update to
     * the ServiceState object.
     */
    if (this.serviceMapping[service] === undefined || !isRESTMethod(method)) {
      // Service does not exist, no need to retain state.
      // This method might be called twice in an attempt to recover from the fluent
      // API, where `method` will be passed the service and `service` will be passed
      // the fluent method used, so we verify both exist at this point.
      //
      // i.e. `state.github(....)` // make sure `github` specification exists
      // i.e. `state.github.get(...).post(...)` // make sure both `get` and `post` are correct methods
      throw new Error(
        `Can't find specification for service named '${
          isRESTMethod(method) ? service : method
        }'!`,
      );
    }

    const servicePaths = this.serviceMapping[service].schema.paths;
    if (servicePaths === undefined) {
      throw new Error(`'${service}' has no defined paths!`);
    }
    if (endpoint !== DEFAULT_ENDPOINT) {
      // TODO: Verify with regex by iteration
      if (servicePaths[endpoint] === undefined) {
        // This endpoint does not exist, no need to retain state
        throw new Error(`Can't find endpoint '${endpoint}' for '${service}'!`);
      }
      if (
        method !== DEFAULT_REST_METHOD &&
        servicePaths[endpoint][method] === undefined
      ) {
        // The endpoint exists but the specified method for that endpoint doesnt
        throw new Error(
          `Can't find response for '${method} ${endpoint}' in ${service}!`,
        );
      }
    }

    this.serviceMapping[service].updateState({
      endpoint,
      method,
      newState: state,
    });
  }
}
