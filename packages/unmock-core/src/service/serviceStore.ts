import { ISerializedRequest } from "../interfaces";
import {
  ExtendedHTTPMethod,
  IService,
  IServiceMapping,
  isExtendedRESTMethod,
  isStateInputGenerator,
  IStateInputGenerator,
  MatcherResponse,
  UnmockServiceState,
} from "./interfaces";
import {
  functionResponse,
  objResponse,
  textResponse,
} from "./state/transformers";

export class ServiceStore {
  private readonly serviceMapping: IServiceMapping = {};

  constructor(services: IService[]) {
    services.forEach(service => {
      this.serviceMapping[service.name] = service;
    });
  }

  public match(sreq: ISerializedRequest): MatcherResponse {
    for (const service of Object.values(this.serviceMapping)) {
      const matchResponse = service.match(sreq);
      if (matchResponse !== undefined) {
        return matchResponse;
      }
    }
    return undefined;
  }

  public resetState(serviceName: string | undefined) {
    if (serviceName === undefined) {
      for (const service of Object.values(this.serviceMapping)) {
        service.resetState();
      }
    } else if (this.serviceMapping[serviceName] !== undefined) {
      this.serviceMapping[serviceName].resetState();
    }
  }

  public saveState({
    serviceName,
    method,
    endpoint,
    state,
  }: {
    serviceName: string;
    endpoint: string;
    method: ExtendedHTTPMethod;
    state: IStateInputGenerator | UnmockServiceState | string | undefined;
  }) {
    /**
     * Verifies logical flow of inputs before dispatching the update to
     * the ServiceState object.
     */
    if (
      this.serviceMapping[serviceName] === undefined ||
      !isExtendedRESTMethod(method)
    ) {
      // Service does not exist, no need to retain state.
      // This method might be called twice in an attempt to recover from the fluent
      // API, where `method` will be passed the service and `service` will be passed
      // the fluent method used, so we verify both exist at this point.
      //
      // i.e. `state.github(....)` // make sure `github` specification exists
      // i.e. `state.github.get(...).post(...)` // make sure both `get` and `post` are correct methods
      throw new Error(
        `Can't find specification for service named '${
          isExtendedRESTMethod(method) ? serviceName : method
        }'!`,
      );
    }
    // Given an object, set default generator for state
    const stateGen = isStateInputGenerator(state)
      ? state
      : typeof state === "string"
      ? textResponse(state)
      : typeof state === "function"
      ? functionResponse(state)
      : objResponse(state);

    this.serviceMapping[serviceName].updateState({
      endpoint,
      method,
      newState: stateGen,
    });
  }
}
