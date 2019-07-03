import { OpenAPIObject, Schema } from "loas3/dist/src/generated/full";
import { ISerializedRequest } from "../interfaces";
import { DEFAULT_STATE_HTTP_METHOD } from "./constants";

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

export const isRESTMethod = (maybeMethod: string): maybeMethod is HTTPMethod =>
  RESTMethodTypes.toString().includes(maybeMethod.toLowerCase());
export const isExtendedRESTMethod = (
  maybeMethod: string,
): maybeMethod is ExtendedHTTPMethod =>
  maybeMethod === DEFAULT_STATE_HTTP_METHOD || isRESTMethod(maybeMethod);

export interface IServiceMapping {
  [serviceName: string]: IService;
}

export interface IStateInput {
  method: ExtendedHTTPMethod;
  endpoint: string;
  newState: UnmockServiceState;
}
export interface IServiceInput {
  schema: OpenAPIObject;
  name: string;
}

export interface IResponsesFromOperation {
  // Maps between a status code, to a response type (e.g. "application/json") to a spread state
  [statusCode: string]: Record<string, Record<string, Schema>>;
}

export type MatcherResponse = any | undefined;

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
   * Match a given request to the service. Return an operation object for successful match,
   * undefined otherwise.
   * @param sreq Serialized request
   * @returns Operation object for generating a response
   */
  match(sreq: ISerializedRequest): MatcherResponse;
}

/**
 * DSL related parameters that can only be found at the top level
 */
interface ITopLevelDSL {
  /**
   * Defines the response based on the requested response code.
   * If the requested response code is not found, returns 'default'
   */
  $code?: number;
}

/**
 * DSL related parameters that can be found at any level in the schema
 */
interface IDSL {
  /**
   * Used to control and generate arrays of specific sizes.
   */
  $size?: number;
}

interface INestedState<T> {
  [key: string]: INestedState<T> | T;
}

interface IUnmockServiceState
  extends INestedState<IDSL | string | number | (() => string | number)> {}
/**
 * Defines how a state can look like without validation against
 * the actual service specification.
 * Validation can be done either in runtime or via IDE extensions.
 */
export type UnmockServiceState = IUnmockServiceState & ITopLevelDSL;
