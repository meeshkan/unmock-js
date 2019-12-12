import * as url from "whatwg-url";
import { IObjectToService, IServiceCore, OpenAPIObject } from "./interfaces";
import { Service } from "./service";
import { ServiceCore } from "./serviceCore";

export class ServiceStore {
  private static extractCoresAndServices(coreServices: IServiceCore[]) {
    const cores = coreServices.reduce(
      (o, core) => ({ ...o, [core.name]: core }),
      {},
    );
    const services = coreServices.reduce(
      (o, core) => ({ ...o, [core.name]: new Service(core) }),
      {},
    );
    return { cores, services };
  }
  /**
   * `services` is a wrapper for each `IServiceCore` in `cores`, and is ultimately what's available for the user.
   */
  public services: Record<string, Service>;
  /**
   * `cores` is an internal mapping, allowing manipulation and extraction of services as needed
   */
  public cores: Record<string, IServiceCore>;

  constructor(coreServices: IServiceCore[]) {
    const { cores, services } = ServiceStore.extractCoresAndServices(
      coreServices,
    );
    this.cores = cores;
    this.services = services;
  }

  public update(coreServices: IServiceCore[]) {
    const { cores, services } = ServiceStore.extractCoresAndServices(
      coreServices,
    );
    this.cores = cores;
    this.services = services;
  }

  public updateOrAdd(input: IObjectToService): ServiceStore {
    // TODO: Tighly coupled with OpenAPI at the moment... resolve this at a later time
    const hostName = new url.URL(input.baseUrl).hostname || input.baseUrl;
    const serviceName = input.name || hostName || input.baseUrl;
    const baseSchema: OpenAPIObject =
      serviceName !== undefined && this.cores[serviceName] !== undefined
        ? this.cores[serviceName].schema /* service exists by name */
        : this.cores[hostName] !== undefined
        ? this.cores[hostName].schema /* service exists by base url */
        : {
            /* new service - some template schema */
            openapi: "3.0.0",
            info: {
              title: "Internally built by unmock",
              version: "0.0.0",
            },
            paths: {},
          };
    const newServiceCore = ServiceCore.from(baseSchema, {
      ...input,
      name: serviceName,
    });
    if (
      this.cores[hostName] !== undefined &&
      this.cores[serviceName] === undefined
    ) {
      // remove old service core and wrapper if a service is renamed
      delete this.cores[hostName];
      delete this.services[hostName];
    }
    this.cores[serviceName] = newServiceCore;
    this.services[serviceName] = new Service(newServiceCore);

    return this;
  }
}
