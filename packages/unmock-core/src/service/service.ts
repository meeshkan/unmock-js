import { DEFAULT_STATE_ENDPOINT, DEFAULT_STATE_HTTP_METHOD } from "./constants";
import {
  ExtendedHTTPMethod,
  isRESTMethod,
  isStateInputGenerator,
  UnmockServiceState,
} from "./interfaces";
export { ServiceParser } from "./parser";
import { ServiceCore } from "./serviceCore";
import {
  functionResponse,
  objResponse,
  textResponse,
} from "./state/transformers";

export class Service {
  public readonly state: any;
  constructor(private readonly core: ServiceCore) {
    this.state = new Proxy(
      this.updateDefaultState.bind(this),
      StateHandler(this.core),
    );
  }

  private updateDefaultState(state: UnmockServiceState | string): void;
  private updateDefaultState(
    endpoint: string,
    state: UnmockServiceState | string,
  ): void;
  private updateDefaultState(
    stateOrEndpoint: string | UnmockServiceState,
    maybeState?: UnmockServiceState | string,
    method: ExtendedHTTPMethod = DEFAULT_STATE_HTTP_METHOD,
  ) {
    const { state, endpoint } =
      maybeState === undefined
        ? { state: stateOrEndpoint, endpoint: DEFAULT_STATE_ENDPOINT }
        : { state: maybeState, endpoint: stateOrEndpoint as string };

    const newState = isStateInputGenerator(state)
      ? state
      : typeof state === "string"
      ? textResponse(state)
      : typeof state === "function"
      ? functionResponse(state)
      : objResponse(state);

    this.core.updateState({ endpoint, method, newState });
  }
}

const AfterResetHandler = {
  // underscores are used to ignore the argument not being used
  get: (_: any, _2: any) => {
    throw new Error(
      "Don't use fluent API after reseting a state, it makes it harder to track the state changes.",
    );
  },
  apply: (_: any, _2: any, _3: any[]) => {
    throw new Error("Don't use fluent API after reseting a state!");
  },
};

const StateHandler = (service: ServiceCore) => ({
  get: (stateUpdateFn: any, resetOrRestMethod: string): any => {
    // Accessing an attribute under state - different HTTP methods or reset
    if (isRESTMethod(resetOrRestMethod)) {
      // `resetOrRestMethod` is indeed a method and we use the previously used service
      return (
        endpoint: string = DEFAULT_STATE_ENDPOINT,
        state: UnmockServiceState | undefined | string,
      ) => {
        stateUpdateFn(endpoint, state, resetOrRestMethod);
        return new Proxy({}, StateHandler(service));
      };
    }
    // `resetOrRestMethod` is either "reset" or some bogus we can't handle
    if (resetOrRestMethod === "reset") {
      // call the reset function, and return a throwing proxy
      return () => {
        service.resetState();
        return new Proxy({}, AfterResetHandler);
      };
    }
    throw new Error(
      `Unsure what to do with '${resetOrRestMethod}' when setting a state for ${service.name}`,
    );
  },
});
