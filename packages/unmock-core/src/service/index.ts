import { DEFAULT_STATE_ENDPOINT, DEFAULT_STATE_HTTP_METHOD } from "./constants";
import {
  ExtendedHTTPMethod,
  HTTPMethod,
  isRESTMethod,
  UnmockServiceState,
} from "./interfaces";
import { ServiceStore } from "./serviceStore";
export { ServiceParser } from "./parser";

const saveStateProxy = (store: ServiceStore, serviceName: string) => (
  endpoint = DEFAULT_STATE_ENDPOINT,
  state: UnmockServiceState,
  method: ExtendedHTTPMethod = DEFAULT_STATE_HTTP_METHOD,
) => {
  // Returns a function for the end user to update the state in,
  // while maintaining endpoints and methods.
  if (typeof endpoint !== "string") {
    state = endpoint;
    endpoint = DEFAULT_STATE_ENDPOINT;
  }
  store.saveState({ endpoint, method, serviceName, state });
  return new Proxy(store, StateHandler(serviceName));
};

const saveStateHelper = (fn: any, method: HTTPMethod) => (
  // Redirects method, endpoint and state via currying to fn()
  endpoint = DEFAULT_STATE_ENDPOINT,
  state: UnmockServiceState,
) => fn(endpoint, state, method);

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
      get: (store: ServiceStore, serviceName: string): any => {
        if (serviceName === "reset") {
          return () => {
            store.resetState(undefined);
            // If `reset()` was called without leading service, do not continue fluent API
          };
        }
        return createAndReturnProxy(store, serviceName);
      },
    };
  }

  return {
    // A previous service was already called in the fluent API
    // Parameter accepted can be either a REST method or a new service
    get: (store: ServiceStore, methodOrServiceName: string) => {
      if (prevServiceName === undefined) {
        // should never reach here for undefined `prevServiceName` (checked above...)
        throw new Error("Weird proxy handling; contact maintainers");
      }
      if (!isRESTMethod(methodOrServiceName)) {
        // `methodOrServiceName` is actually `serviceName` or "reset"
        if (methodOrServiceName === "reset") {
          // call the reset function, and return the same proxy...
          store.resetState(prevServiceName);
          return createAndReturnProxy(store, prevServiceName);
        }
        return createAndReturnProxy(store, methodOrServiceName);
      }
      // `methodOrServiceName` is indeed a method and we use the previously used service
      const proxy = saveStateProxy(store as ServiceStore, prevServiceName);
      return saveStateHelper(proxy, methodOrServiceName);
    },
  };
};

// Returns as any to allow for type-free DSL-like access to services and states
export const stateStoreFactory = (serviceStore: ServiceStore): any =>
  new Proxy(serviceStore, StateHandler());
