import { ISerializedRequest } from "../interfaces";
import { IServiceCore, IServiceMapping, MatcherResponse } from "./interfaces";

export class ServiceStore {
  private readonly serviceMapping: IServiceMapping = {};

  constructor(services: IServiceCore[]) {
    services.forEach(service => {
      this.serviceMapping[service.name] = service;
    });
  }

  public match(sreq: ISerializedRequest): MatcherResponse {
    // TODO: Maybe use fp-ts' Option here
    return Object.values(this.serviceMapping)
      .map(service => service.match(sreq))
      .filter(res => res !== undefined)[0];
  }
}
