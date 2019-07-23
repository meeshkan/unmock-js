import { DEFAULT_STATE_ENDPOINT, DEFAULT_STATE_HTTP_METHOD } from "./constants";
import {
  ExtendedHTTPMethod,
  HTTPMethod,
  isRESTMethod,
  IStateInputGenerator,
  UnmockServiceState,
} from "./interfaces";
import { ServiceStore } from "./serviceStore";
export { ServiceParser } from "./parser";

const saveStateProxy = (store: ServiceStore, serviceName: string) => (
  method: ExtendedHTTPMethod = DEFAULT_STATE_HTTP_METHOD,
) => (endpoint = DEFAULT_STATE_ENDPOINT, state: UnmockServiceState) => {
  // Returns a function for the end user to update the state in,
  // while maintaining endpoints and methods.
  if (typeof endpoint !== "string") {
    state = endpoint;
    endpoint = DEFAULT_STATE_ENDPOINT;
  }
  store.saveState({ endpoint, method, serviceName, state });
  return new Proxy(store, StateHandler(serviceName));
};

const MethodHandler = {
  // obj is actually saveStateProxy
  get: (obj: any, method: HTTPMethod) => obj(method),
  apply: (obj: any, _: ServiceStore, args: any[]) => obj()(...args),
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
      return proxy(methodOrServiceName);
    },
  };
};

type SetStateForAllPaths =
  /**
   * Sets the given state for all endpoints in the current service, for which the state can be applied.
   * @param state An object setting the state or a DSL transformer used to set it.
   * @throws If the given state cannot be applied to any endpoint.
   */
  (
    state: IStateInputGenerator | UnmockServiceState,
  ) => StateStoreType & SetStateForSpecificMethod;

type SetStateForMatchingEndpoint =
  /**
   * Sets the given state for the given endpoint (or matching endpoints if using a glob pattern).
   * @param {string} endpoint Desired endpoint for the state.
   *   You may use single asterisks for single path item replacement.
   *   Example: If a service specified an endpoint '/pets/{pet_id}/name',
   *            an asterisk may be used instead of {pet_id} or a specific id.
   * @param state An object setting the state or a DSL transformer used to set it.
   * @throws If the state cannot be applied to the given endpoint.
   */
  (
    endpoint: string,
    state: IStateInputGenerator | UnmockServiceState,
  ) => StateStoreType & SetStateForSpecificMethod;

type SetStateType = SetStateForAllPaths & SetStateForMatchingEndpoint;

interface IResetState {
  /**
   * Resets the state for the current service, or for the entire state store.
   * You may not continue using the fluent API after this call.
   */
  reset(): void;
}

type SetStateForSpecificMethod = {
  // All HTTP methods can set a state
  [P in HTTPMethod]: SetStateType;
} &
  IResetState;

type StateStoreType = {
  // Has either `reset()` function or string signature with function call
  [serviceName: string]: SetStateType & SetStateForSpecificMethod;
} & IResetState;

// Returns as any to allow for type-free DSL-like access to services and states
export const stateStoreFactory = (serviceStore: ServiceStore): StateStoreType =>
  new Proxy(serviceStore, StateHandler()) as any;
