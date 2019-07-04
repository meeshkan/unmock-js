import { ISerializedRequest } from "../interfaces";
import {
  ExtendedHTTPMethod,
  IService,
  IServiceMapping,
  isExtendedRESTMethod,
  MatcherResponse,
  UnmockServiceState,
} from "./interfaces";

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

  public saveState({
    serviceName: service,
    method,
    endpoint,
    state,
  }: {
    serviceName: string;
    endpoint: string;
    method: ExtendedHTTPMethod;
    state: UnmockServiceState;
  }) {
    /**
     * Verifies logical flow of inputs before dispatching the update to
     * the ServiceState object.
     */
    if (
      this.serviceMapping[service] === undefined ||
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
          isExtendedRESTMethod(method) ? service : method
        }'!`,
      );
    }

    const error = this.serviceMapping[service].updateState({
      endpoint,
      method,
      newState: state,
    });
    if (error !== undefined) {
      throw new Error(error);
    }
  }
}
