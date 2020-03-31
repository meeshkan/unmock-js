import { mapValues } from "lodash";
import * as url from "whatwg-url";
import {
  ExtendedJSONSchema,
  IFluentDynamicService,
  nockify,
  vanillaJSONSchemify,
} from "../nock";
import { IObjectToService, IServiceCore, OpenAPIObject } from "./interfaces";
import { Service } from "./service";
import { ServiceCore } from "./serviceCore";

export type NockAPI = (
  baseUrl: string,
  nameOrHeaders?: string | { reqheaders?: Record<string, ExtendedJSONSchema> },
  name?: string,
) => IFluentDynamicService;

export const addFromNock = (serviceStore: ServiceStore): NockAPI => (
  baseUrl: string,
  nameOrHeaders?: string | { reqheaders?: Record<string, ExtendedJSONSchema> },
  name?: string,
) => {
  const internalName =
    typeof nameOrHeaders === "string"
      ? nameOrHeaders
      : typeof name === "string"
      ? name
      : undefined;
  const requestHeaders =
    typeof nameOrHeaders === "object" && nameOrHeaders.reqheaders
      ? Object.entries(nameOrHeaders.reqheaders).reduce(
          (a, b) => ({ ...a, [b[0]]: vanillaJSONSchemify(b[1]) }),
          {},
        )
      : {};
  return nockify({
    serviceStore,
    baseUrl,
    requestHeaders,
    name: internalName,
  });
};

export class ServiceStore {
  private static extractCoresAndServices(coreServices: IServiceCore[]) {
    const services = coreServices.reduce(
      (o, core) => ({ ...o, [core.name]: new Service(core) }),
      {},
    );
    return { services };
  }
  /**
   * Internal map from the service name to `Service` object.
   */
  public services: Record<string, Service>;

  constructor(coreServices: IServiceCore[]) {
    const { services } = ServiceStore.extractCoresAndServices(coreServices);
    this.services = services;
  }

  public get cores(): Record<string, IServiceCore> {
    return mapValues(this.services, (service: Service) => service.core);
  }

  /**
   * Replace all services with the given array of services.
   * @param coreServices List of service cores.
   */
  public update(coreServices: IServiceCore[]) {
    const { services } = ServiceStore.extractCoresAndServices(coreServices);
    this.services = services;
  }

  /**
   * Add a new service to the store.
   * @param service Service instance.
   * @throws Error if a service with the same name already exists.
   */
  public add(service: Service): void {
    const serviceName = service.core.name;

    if (this.serviceExists(serviceName)) {
      throw Error(`Service with name ${serviceName} exists.`);
    }

    this.updateOrAddService(service);
  }

  /**
   * Update a service or add a new service if one with the given name does not exist.
   * @param service Service instance.
   */
  public updateOrAddService(service: Service): void {
    const serviceName = service.core.name;
    this.services[serviceName] = service;
  }

  /**
   * Add service to the store using `nock` syntax.
   * @param baseUrl Base URL. For example: "https://api.github.com"
   * @param nameOrHeaders Service name or the headers.
   * @param name Service name if the second argument was headers.
   */
  public mock(
    baseUrl: string,
    nameOrHeaders?:
      | string
      | { reqheaders?: Record<string, ExtendedJSONSchema> },
    name?: string,
  ) {
    const internalName =
      typeof nameOrHeaders === "string"
        ? nameOrHeaders
        : typeof name === "string"
        ? name
        : undefined;
    const requestHeaders =
      typeof nameOrHeaders === "object" && nameOrHeaders.reqheaders
        ? Object.entries(nameOrHeaders.reqheaders).reduce(
            (a, b) => ({ ...a, [b[0]]: vanillaJSONSchemify(b[1]) }),
            {},
          )
        : {};
    return nockify({
      serviceStore: this,
      baseUrl,
      requestHeaders,
      name: internalName,
    });
  }

  public updateOrAdd(input: IObjectToService): ServiceStore {
    // TODO: Tighly coupled with OpenAPI at the moment... resolve this at a later time
    const hostName = new url.URL(input.baseUrl).hostname || input.baseUrl;
    const serviceName = input.name || hostName || input.baseUrl;
    const cores = this.cores;
    const baseSchema: OpenAPIObject =
      serviceName !== undefined && cores[serviceName] !== undefined
        ? cores[serviceName].schema /* service exists by name */
        : cores[hostName] !== undefined
        ? cores[hostName].schema /* service exists by base url */
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
    if (cores[hostName] !== undefined && cores[serviceName] === undefined) {
      // remove old service if renamed
      delete this.services[hostName];
    }
    this.services[serviceName] = new Service(newServiceCore);

    return this;
  }

  /**
   * Remove all services from the store.
   */
  public removeAll() {
    this.update([]);
  }

  /**
   * Reset the states of all services in store.
   */
  public resetServices() {
    Object.values(this.services).forEach(service => service.reset());
  }

  private serviceExists(name: string): boolean {
    return Object.keys(this.services).includes(name);
  }
}
