import {
  OpenAPIObject,
  Operation,
  PathItem,
  Schema,
} from "loas3/dist/src/generated/full";
import { ISerializedRequest } from "../interfaces";
import { DEFAULT_STATE_HTTP_METHOD } from "./constants";
import { IDSL, ITopLevelDSL } from "./dsl/interfaces";

export {
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
} from "loas3/dist/src/generated/full";

const RESTMethodTypes = [
  "get",
  "head",
  "post",
  "put",
  "delete",
  "options",
  "trace",
] as const;

const DEF_REST_METHOD = [DEFAULT_STATE_HTTP_METHOD] as const;

type DEFAULT_HTTP_METHOD_AS_TYPE = typeof DEF_REST_METHOD[number];
export type HTTPMethod = typeof RESTMethodTypes[number];
export type ExtendedHTTPMethod = HTTPMethod | DEFAULT_HTTP_METHOD_AS_TYPE;

export type OASMethodKey = keyof PathItem & HTTPMethod;

export const isRESTMethod = (maybeMethod: string): maybeMethod is HTTPMethod =>
  RESTMethodTypes.toString().includes(maybeMethod.toLowerCase());
export const isExtendedRESTMethod = (
  maybeMethod: string,
): maybeMethod is ExtendedHTTPMethod =>
  maybeMethod === DEFAULT_STATE_HTTP_METHOD || isRESTMethod(maybeMethod);

export interface IServiceMapping {
  [serviceName: string]: IService;
}

export interface IStateInputGenerator {
  isEmpty: boolean;
  gen: (schema: Schema) => Record<string, Schema>;
  top: ITopLevelDSL;
}
export const isStateInputGenerator = (u: any): u is IStateInputGenerator =>
  u !== undefined &&
  u.top !== undefined &&
  u.gen !== undefined &&
  typeof u.top === "function" &&
  typeof u.gen === "function";

export interface IStateInput {
  method: ExtendedHTTPMethod;
  endpoint: string;
  newState: IStateInputGenerator;
}
export interface IServiceInput {
  schema: OpenAPIObject;
  name: string;
}

// maps from media types (e.g. "application/json") to schema
export type mediaTypeToSchema = Record<string, Schema>;
// maps from status to mediaTypeToSchema
export type codeToMedia = Record<string, mediaTypeToSchema>;

export type MatcherResponse =
  | { operation: Operation; state: codeToMedia | undefined }
  | undefined;

export interface IService {
  /**
   * Name for the service.
   */
  readonly name: string;

  /**
   * Holds the OpenAPI Schema object (refered to as OAS).
   */
  readonly schema: OpenAPIObject;

  /**
   * Whether the OAS has a defined "paths" object or not.
   */
  hasDefinedPaths: boolean;

  /**
   * Updates the state for given method and endpoint.
   * @param input Describes the new state that matches a method and endpoint.
   * @throws on logical errors where the state is invalid.
   */
  updateState(input: IStateInput): void;

  /**
   * Resets the entire state saved for this service.
   * This provides easy access to wipe a state after every test.
   */
  resetState(): void;

  /**
   * Match a given request to the service. Return an operation object for successful match,
   * undefined otherwise.
   * @param sreq Serialized request
   * @returns Operation object for generating a response
   */
  match(sreq: ISerializedRequest): MatcherResponse;
}

interface INestedState<T> {
  [key: string]: INestedState<T> | T;
}

interface IUnmockServiceState
  extends INestedState<
    IDSL | string | number | (() => string | number) | undefined | boolean
  > {}
/**
 * Defines how a state can look like without validation against
 * the actual service specification.
 * Validation can be done either in runtime or via IDE extensions.
 */
export type UnmockServiceState = IUnmockServiceState & ITopLevelDSL;
