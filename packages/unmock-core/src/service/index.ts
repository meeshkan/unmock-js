import { DEFAULT_ENDPOINT, DEFAULT_REST_METHOD } from "./constants";
import {
  HTTPMethod,
  IOASMappingGenerator,
  isRESTMethod,
  IUnmockServiceState,
} from "./interfaces";
import { ServiceStore } from "./serviceStore";

const saveStateProxy = (store: ServiceStore, serviceName: string) => (
  endpoint = DEFAULT_ENDPOINT,
  method: HTTPMethod = DEFAULT_REST_METHOD,
  state: IUnmockServiceState,
) => {
  // Returns a function for the end user to update the state in,
  // while maintaining endpoints and methods.
  if (typeof endpoint !== "string") {
    state = endpoint;
    endpoint = DEFAULT_ENDPOINT;
  }
  store.__saveState({ endpoint, method, serviceName, state });
  return new Proxy(store, StateHandler(serviceName));
};

const saveStateHelper = (fn: any, method: HTTPMethod) => (
  // Redirects method, endpoint and state via currying to fn()
  endpoint = DEFAULT_ENDPOINT,
  state: IUnmockServiceState,
) => fn(endpoint, method, state);

const MethodHandler = {
  // we get here if a user used e.g `state.github.get(...)`
  // obj is actually saveStateProxy
  get: (obj: any, method: HTTPMethod) => saveStateHelper(obj, method),
};

const StateHandler = (prevServiceName?: string) => {
  const createAndReturnProxy = (store: ServiceStore, serviceName: string) => {
    const proxy = new Proxy(saveStateProxy(store, serviceName), MethodHandler);
    prevServiceName = serviceName;
    return proxy;
  };

  if (prevServiceName === undefined) {
    // New call, return the default proxy handler
    return {
      get: (store: ServiceStore, serviceName: string) =>
        createAndReturnProxy(store, serviceName),
    };
  }

  return {
    // A previous service was already called in the fluent API
    // Parameter accepted can be either a REST method or a new service
    get: (store: ServiceStore, methodOrServiceName: string) => {
      if (prevServiceName === undefined || !isRESTMethod(methodOrServiceName)) {
        // should never reach here for undefined `prevServiceName`
        // could reach here due to invalid REST method
        // Either way, previous service name should be overwritten
        // and `methodOrServiceName` is actually `serviceName`
        return createAndReturnProxy(store, methodOrServiceName);
      }
      // `methodOrServiceName` is indeed a method and we use the previously used service
      const proxy = saveStateProxy(store as ServiceStore, prevServiceName);
      return saveStateHelper(proxy, methodOrServiceName);
    },
  };
};

export const serviceStoreFactory = (servicePopulator: IOASMappingGenerator) =>
  new Proxy(new ServiceStore(servicePopulator), StateHandler());
