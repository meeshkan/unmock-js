import { DEFAULT_ENDPOINT, DEFAULT_REST_METHOD } from "./constants";
import { HTTPMethod, IOASMappingGenerator, IStateMapping } from "./interfaces";
import { Service } from "./service";

class ServiceStore {
  private statesMapping: { [key: string]: Service } = {};

  constructor(servicePopulator: IOASMappingGenerator) {
    const services = servicePopulator();
    Object.keys(services).forEach(k => {
      this.statesMapping[k] = new Service(services[k]);
    });
  }

  public __saveState({
    service,
    method,
    endpoint,
    state,
  }: {
    service: string;
    endpoint: string;
    method: HTTPMethod;
    state: IStateMapping;
  }) {
    /**
     * Verifies logical flow of inputs before dispatching the update to
     * the ServiceState object.
     */
    if (this.statesMapping[service] === undefined) {
      // Service does not exist, no need to retain state.
      throw new Error(
        `Can't find specification for service named '${service}'!`,
      );
    }

    const servicePaths = this.statesMapping[service].schema.paths;
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

    this.statesMapping[service].updateState({
      endpoint,
      method,
      newState: state,
    });
  }
}

const saveStateProxy = (obj: ServiceStore, serviceName: string) => (
  endpoint = DEFAULT_ENDPOINT,
  state: IStateMapping,
  method: HTTPMethod = DEFAULT_REST_METHOD,
) => {
  // Returns a function for the end user to update the state in,
  // while maintaining endpoints and methods.
  if (typeof endpoint !== "string") {
    state = endpoint;
    endpoint = DEFAULT_ENDPOINT;
  }
  obj.__saveState({ endpoint, method, service: serviceName, state });
  return new Proxy(obj, StateHandler);
};

const MethodHandler = {
  get: (obj: any, prop: any) => {
    // prop is method name being called
    // we get here if a user used e.g `state.github.get(...)`
    // obj is actually the underlying function in save_state_proxy
    return (endpoint = DEFAULT_ENDPOINT, state: IStateMapping) => {
      return obj(endpoint, state, prop as HTTPMethod);
    };
  },
};

const StateHandler = {
  get: (obj: any, prop: any) => {
    // prop is the function name being called
    return new Proxy(saveStateProxy(obj as ServiceStore, prop), MethodHandler);
  },
};

export const serviceStoreFactory = (servicePopulator: IOASMappingGenerator) =>
  new Proxy(new ServiceStore(servicePopulator), StateHandler);
