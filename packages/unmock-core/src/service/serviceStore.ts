import { DEFAULT_ENDPOINT, DEFAULT_REST_METHOD } from "./constants";
import {
  HTTPMethod,
  IOASMappingGenerator,
  isRESTMethod,
  IStateMapping,
} from "./interfaces";
import { Service } from "./service";

class ServiceStore {
  private statesMapping: { [key: string]: Service } = {};
  private lastServiceUpdated: string | undefined;

  constructor(servicePopulator: IOASMappingGenerator) {
    const services = servicePopulator();
    Object.keys(services).forEach(k => {
      this.statesMapping[k] = new Service(services[k]);
    });
  }

  public newFluent() {
    this.lastServiceUpdated = undefined;
  }

  get lastService() {
    return this.lastServiceUpdated;
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
    state: IStateMapping;
  }) {
    /**
     * Verifies logical flow of inputs before dispatching the update to
     * the ServiceState object.
     */
    if (this.statesMapping[service] === undefined || !isRESTMethod(method)) {
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

    this.lastServiceUpdated = service;
    this.statesMapping[service].updateState({
      endpoint,
      method,
      newState: state,
    });
  }
}

const saveStateProxy = (store: ServiceStore, serviceName: string) => (
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
  try {
    // First try to update state for METHOD SERVICE ENDPOINT
    store.__saveState({ endpoint, method, serviceName, state });
  } catch (e) {
    // If it doesn't succeed and we had done a previous state update
    // Try and update that via METHOD (serviceName) SERVICE (previous) ENDPOINT
    if (store.lastService !== undefined) {
      store.__saveState({
        endpoint,
        method: serviceName as HTTPMethod,
        serviceName: store.lastService,
        state,
      });
    } else {
      throw e;
    }
  }
  return new Proxy(store, StateHandler(false));
};

const MethodHandler = {
  get: (obj: any, method: any) => {
    // we get here if a user used e.g `state.github.get(...)`
    // obj is actually saveStateProxy
    return (endpoint = DEFAULT_ENDPOINT, state: IStateMapping) =>
      obj(endpoint, state, method as HTTPMethod);
  },
};

const StateHandler = (initialCall: boolean) => {
  return {
    get: (store: any, serviceName: any) => {
      if (initialCall) {
        (store as ServiceStore).newFluent();
      }
      return new Proxy(
        saveStateProxy(store as ServiceStore, serviceName),
        MethodHandler,
      );
    },
  };
};

export const serviceStoreFactory = (servicePopulator: IOASMappingGenerator) =>
  new Proxy(new ServiceStore(servicePopulator), StateHandler(true));
