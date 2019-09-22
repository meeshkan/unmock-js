import { defaultsDeep, unionBy } from "lodash";
import { ISerializedRequest } from "../interfaces";
import {
  IObjectToService,
  IServiceCore,
  OpenAPIObject,
  PathItem,
} from "./interfaces";
import {
  createCallTracker,
  ICallTracker,
  IRequestResponsePair,
  ServiceSpy,
} from "./spy";

export class ServiceCore implements IServiceCore {
  public static from(
    baseSchema: OpenAPIObject,
    {
      baseUrl,
      method,
      query,
      requestHeaders,
      responseHeaders,
      body,
      endpoint,
      statusCode,
      response,
      name,
    }: IObjectToService & { name: string },
  ): IServiceCore {
    // TODO: Very basic guessing for mediaType; extend this as needed (maybe @mime-types or similar?)
    const mediaType =
      typeof response === "string" ? "text/*" : "application/json";
    // TODO: Decouple from ServiceCore :( - this is nasty
    // Create a new endpoint from array if needed
    const endpointParameters = {
      parameters: [
        ...(Array.isArray(endpoint)
          ? (endpoint.filter(e => typeof e !== "string") as Array<
              RegExp | [string, RegExp]
            >).map(e => ({
              in: "path",
              required: true,
              ...(e instanceof RegExp
                ? {
                    name: Math.random()
                      .toString(36)
                      .substring(2),
                    schema: { pattern: e.source },
                  }
                : {
                    name: e[0],
                    schema: {
                      pattern: e[1].source,
                    },
                  }),
            }))
          : []),
        ...Object.entries(requestHeaders || {}).map(([n, s]) => ({
          in: "header",
          required: true,
          name: n,
          schema: s,
        })),
        ...Object.entries(query || {}).map(([n, s]) => ({
          in: "query",
          required: true,
          name: n,
          schema: s,
        })),
      ],
    };
    const newEndpoint = Array.isArray(endpoint)
      ? endpoint
          .map(
            e =>
              typeof e === "string"
                ? e /* string - literal part of the path */
                : `{${endpointParameters.parameters
                    .filter(a =>
                      Array.isArray(e)
                        ? a.name === e[0] && a.schema.pattern === e[1].source
                        : a.schema.pattern === e.source,
                    )
                    .map(a => a.name)
                    .shift()}}`, // otherwise get the next element from endpointParameters
          )
          .join("/")
      : endpoint;
    const finalEndpoint =
      newEndpoint === undefined || newEndpoint.startsWith("/")
        ? newEndpoint
        : `/${newEndpoint}`; /* Prepend leading / if needed */

    const newPath: PathItem =
      finalEndpoint !== undefined &&
      method !== undefined &&
      statusCode !== undefined
        ? {
            [finalEndpoint]: {
              ...endpointParameters,
              [method]: {
                ...(body
                  ? {
                      requestBody: {
                        content: { "application/json": { schema: body } },
                      },
                    }
                  : {}),
                responses: {
                  [statusCode]: {
                    description: "Automatically added",
                    headers: Object.entries(responseHeaders || {}).reduce(
                      (a, b) => ({
                        ...a,
                        [b[0]]: {
                          schema: b[1],
                          required: true,
                        },
                      }),
                      {},
                    ),
                    content: {
                      [mediaType]: { schema: response },
                    },
                  },
                },
              },
            },
          }
        : {};
    const newUrls = [{ url: baseUrl }];

    const newPaths = defaultsDeep(newPath, baseSchema.paths);
    const newServers = unionBy(
      newUrls.concat(baseSchema.servers || []),
      e => e.url,
    );
    const finalSchema = { ...baseSchema, paths: newPaths, servers: newServers };
    return new ServiceCore({
      schema: finalSchema,
      name,
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
