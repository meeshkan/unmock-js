import {
  OpenAPIObject,
  Operation,
  PathItem,
  Schema
} from "loas3/dist/generated/full";
import {
  HTTPMethod,
  ISerializedRequest,
  IStateTransformer
} from "../interfaces";
import { DEFAULT_STATE_HTTP_METHOD } from "./constants";
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
  Responses
} from "loas3/dist/generated/full";

const DEF_REST_METHOD = [DEFAULT_STATE_HTTP_METHOD] as const;

type DEFAULT_HTTP_METHOD_AS_TYPE = typeof DEF_REST_METHOD[number];
export type ExtendedHTTPMethod = HTTPMethod | DEFAULT_HTTP_METHOD_AS_TYPE;

export type OASMethodKey = keyof PathItem & HTTPMethod;

export type Dereferencer = <T>(obj: any) => T;

// maps from media types (e.g. "application/json") to schema
export type mediaTypeToSchema = Record<string, Schema>;
// maps from status to mediaTypeToSchema
export type codeToMedia = Record<string, mediaTypeToSchema>;

export type MatcherResponse =
  | {
      operation: Operation;
      state: codeToMedia | undefined;
      service: IServiceCore;
    }
  | undefined;

export interface IService {
  readonly spy: ServiceSpy;
  reset(): void;
  state(...f: IStateTransformer[]): void;
}

export type ServiceStoreType = Record<string, IService>;

// Used to programmatically define/update a service
export interface IObjectToService {
  baseUrl: string;
  method: HTTPMethod;
  endpoint: string;
  statusCode: number;
  response: string | Schema;
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
   * Holds the absolute path where the service specification resides.
   */
  readonly absPath: string;

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
