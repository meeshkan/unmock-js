import { OpenAPIObject, Schema } from "loas3/dist/generated/full";
import {
  CodeAsInt,
  HTTPMethod,
  ISerializedRequest,
  IStateTransformer,
} from "../interfaces";
import { IRequestResponsePair, ServiceSpy } from "./spy";

export {
  Header,
  isOperation,
  isReference,
  isSchema,
  MediaType,
  OpenAPIObject,
  Paths,
  Schema,
  Operation,
  Parameter,
  PathItem,
  Reference,
  Response,
  Responses,
} from "loas3/dist/generated/full";

export interface IService {
  readonly spy: ServiceSpy;
  readonly core: IServiceCore;
  reset(): void;
  state(...f: IStateTransformer[]): void;
}

export type ServiceStoreType = Record<string, IService>;

// Used to programmatically define/update a service
export type ValidEndpointType =
  | string
  | Array<string | RegExp | [string, RegExp]>;
export interface IObjectToService {
  baseUrl: string;
  method?: HTTPMethod;
  endpoint?: ValidEndpointType;
  query?: Record<string, Schema>;
  requestHeaders?: Record<string, Schema>;
  responseHeaders?: Record<string, Schema>;
  body?: Schema;
  statusCode?: CodeAsInt | "default";
  response?: string | Schema;
  name?: string;
}

export interface IServiceCore {
  transformer: (req: ISerializedRequest, o: OpenAPIObject) => OpenAPIObject;

  /**
   * Name for the service.
   */
  readonly name: string;

  /**
   * Holds the OpenAPI Schema object (refered to as OAS).
   */
  readonly schema: OpenAPIObject;

  /**
   * Spy keeping track of request response pairs
   */
  readonly spy: ServiceSpy;

  /**
   * Whether the OAS has a defined "paths" object or not.
   */
  hasDefinedPaths: boolean;

  /**
   * Track a request-response pair, recorded in `spy`
   */
  track(requestResponsePair: IRequestResponsePair): void;
}
