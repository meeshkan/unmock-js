import * as url from "url";
import { IObjectToService, IServiceCore, OpenAPIObject } from "./interfaces";
import { Service } from "./service";
import { ServiceCore } from "./serviceCore";

export class ServiceStore {
  public readonly services: Record<string, Service>;
  public readonly cores: Record<string, IServiceCore>;

  constructor(coreServices: IServiceCore[]) {
    this.cores = coreServices.reduce(
      (o, core) => ({ ...o, [core.name]: core }),
      {},
    );
    this.services = coreServices.reduce(
      (o, core) => ({ ...o, [core.name]: new Service(core) }),
      {},
    );
  }

  public updateOrAdd(input: IObjectToService) {
    // TODO: Tighly coupled with OpenAPI at the moment... resolve this at a later time
    const serviceName =
      input.name || url.parse(input.baseUrl).hostname || input.baseUrl;
    const baseSchema: OpenAPIObject =
      serviceName !== undefined && this.cores[serviceName] !== undefined
        ? // service exists
          this.cores[serviceName].schema
        : // Build new schema object
          {
            openapi: "3.0.0",
            info: { title: "Internally built by unmock", version: "0.0.0" },
            paths: {},
          };
    const newServiceCore = ServiceCore.from(baseSchema, {
      ...input,
      name: serviceName,
    });
    this.cores[serviceName] = newServiceCore;
    this.services[serviceName] = new Service(newServiceCore);

    return this.services[serviceName];
  }
}
