import { defaultsDeep, unionBy } from "lodash";
import { ISerializedRequest } from "../interfaces";
import {
  IObjectToService,
  IServiceCore,
  OpenAPIObject,
  PathItem
} from "./interfaces";
import {
  createCallTracker,
  ICallTracker,
  IRequestResponsePair,
  ServiceSpy
} from "./spy";

export class ServiceCore implements IServiceCore {
  public static from(
    baseSchema: OpenAPIObject,
    {
      baseUrl,
      method,
      endpoint,
      statusCode,
      response,
      name
    }: IObjectToService & { name: string }
  ): IServiceCore {
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
                [mediaType]: { schema: response }
              }
            }
          }
        }
      }
    };
    const newUrls = [{ url: baseUrl }];

    const newPaths = defaultsDeep(newPath, baseSchema.paths);
    const newServers = unionBy(
      newUrls.concat(baseSchema.servers || []),
      e => e.url
    );
    const finalSchema = { ...baseSchema, paths: newPaths, servers: newServers };
    return new ServiceCore({
      schema: finalSchema,
      name
    });
  }

  public readonly name: string;
  public readonly absPath: string;
  private hasPaths: boolean = false;
  private readonly oasSchema: OpenAPIObject;
  private readonly callTracker: ICallTracker;

  constructor(opts: { schema: OpenAPIObject; name: string; absPath?: string }) {
    this.oasSchema = opts.schema;
    this.name = opts.name;
    this.absPath = opts.absPath || process.cwd();
    this.hasPaths = // Find this once, as schema is immutable
      this.schema !== undefined &&
      this.schema.paths !== undefined &&
      Object.keys(this.schema.paths).length > 0;
    this.callTracker = createCallTracker();
  }

  public transformer = (_: ISerializedRequest, o: OpenAPIObject) => o;

  get schema(): OpenAPIObject {
    return this.oasSchema;
  }

  get hasDefinedPaths(): boolean {
    return this.hasPaths;
  }

  public track(requestResponsePair: IRequestResponsePair) {
    this.callTracker.track(requestResponsePair);
  }

  get spy(): ServiceSpy {
    return this.callTracker.spy;
  }
}
