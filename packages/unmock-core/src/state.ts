import { IOASMapping, IOASMappingGenerator, IStateMapping } from "./interfaces";

/**
 * Implements the state management for a service
 */

// TODO: Is there room here for xstate, in the future?

const DEFAULT_ENDPOINT = "**";
const DEFAULT_REST_METHOD = "get";

class ServiceState {
  // private state: IStateMapping = {}; // Maintains a state for service
  public updateState(_: any) {
    // Input: method, endpoint, newState
    // Four possible cases:
    // 1. empty endpoint, empty method -> applies to ALL
    // 2. empty endpoint, non-empty method -> applies to all methods
    // 3. non-empty endpoint, empty method -> applies to all methods in the endpoint
    // 4. non-empty endpoint, non-empty method -> applies to that specific combination
  }
}

// tslint:disable-next-line: max-classes-per-file
class State {
  private servicesMapping: IOASMapping = {};
  private statesMapping: { [key: string]: ServiceState } = {};

  constructor(servicePopulator: IOASMappingGenerator) {
    this.servicesMapping = servicePopulator();
  }

  public __saveState({
    service,
    method,
    endpoint,
    state,
  }: {
    service: string;
    endpoint: string;
    method: string;
    state: IStateMapping;
  }) {
    /**
     * Verifies logical flow of inputs before dispatching the update to
     * the ServiceState object.
     */
    if (this.servicesMapping[service] === undefined) {
      // Service does not exist, no need to retain state.
      throw new Error(
        `Can't find specification for service named '${service}'!`,
      );
    }

    const servicePaths = this.servicesMapping[service].paths;
    if (servicePaths === undefined) {
      throw new Error(`'${service}' has no defined paths!`);
    }
    if (endpoint !== DEFAULT_ENDPOINT) {
      if (servicePaths[endpoint] === undefined) {
        // This endpoint does not exist, no need to retain state
        throw new Error(`Can't find endpoint '${endpoint}' for '${service}'!`);
      }
      if (
        method !== undefined &&
        servicePaths[endpoint][method] === undefined
      ) {
        // The endpoint exists but the specified method for that endpoint doesnt
        throw new Error(
          `Can't find response for '${method} ${endpoint}' in ${service}!`,
        );
      }
    }

    if (this.statesMapping[service] === undefined) {
      this.statesMapping[service] = new ServiceState();
    }

    this.statesMapping[service].updateState({
      endpoint,
      method,
      newState: state,
    });
  }
}

const saveStateProxy = (obj: State, serviceName: string) => (
  endpoint = DEFAULT_ENDPOINT,
  state: IStateMapping,
  method = DEFAULT_REST_METHOD,
) => {
  // Returns a function for the end user to update the state in,
  // while maintaining endpoints and methods.
  if (typeof endpoint !== "string") {
    state = endpoint;
    endpoint = DEFAULT_ENDPOINT;
  }
  obj.__saveState({ service: serviceName, state, endpoint, method });
  return new Proxy(obj, StateHandler);
};

const MethodHandler = {
  get: (obj: any, prop: any) => {
    // prop is method name being called
    // we get here if a user used e.g `state.github.get(...)`
    // obj is actually the underlying function in save_state_proxy
    return (endpoint = DEFAULT_ENDPOINT, state: IStateMapping) => {
      return obj(endpoint, state, prop);
    };
  },
};

const StateHandler = {
  get: (obj: any, prop: any) => {
    // prop is the function name being called
    return new Proxy(saveStateProxy(obj as State, prop), MethodHandler);
  },
};

export const stateFactory = (servicePopulator: IOASMappingGenerator) =>
  new Proxy(new State(servicePopulator), StateHandler);
