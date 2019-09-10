import { defaultsDeep } from "lodash";
import * as url from "url";
import { HTTPMethod } from "../interfaces";
import { IServiceCore, OpenAPIObject, PathItem, Schema } from "./interfaces";
import { Service } from "./service";
import { ServiceCore } from "./serviceCore";

export interface IObjectToService {
  baseUrl: string;
  method: HTTPMethod;
  endpoint: string;
  statusCode: number;
  response: string | Schema;
  name?: string;
}

export class ServiceStore {
  public readonly services: Record<string, Service>;
  private readonly cores: Record<string, IServiceCore>;
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

  public updateOrAdd({
    baseUrl,
    method,
    endpoint,
    statusCode,
    response,
    name,
  }: IObjectToService) {
    // TODO: Tighly coupled with OpenAPI at the moment... resolve this at a later time
    const serviceName = name || url.parse(baseUrl).hostname || baseUrl;
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
    // TODO: Very basic guessing for mediaType; extend this as needed (maybe @mime-types or similar?)
    const mediaType =
      typeof response === "string" ? "text/*" : "application/json";
    // TODO: Decouple from ServiceCore :( - this is nasty
    const newPath: PathItem = {
      [endpoint]: {
        [method]: {
          responses: {
            [statusCode]: {
              description: "Automatically added",
              content: {
                [mediaType]: { schema: response },
              },
            },
          },
        },
      },
    };
    const newUrls = [{ url: baseUrl }];

    const newPaths = defaultsDeep(newPath, baseSchema.paths);
    const newServers = defaultsDeep(newUrls, baseSchema.servers);
    const finalSchema = { ...baseSchema, paths: newPaths, servers: newServers };
    const newServiceCore = new ServiceCore({
      schema: finalSchema,
      name: serviceName,
    });
    this.cores[serviceName] = newServiceCore;
    this.services[serviceName] = new Service(newServiceCore);

    return this.services[serviceName];
  }
}
