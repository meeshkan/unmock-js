import { OpenAPIObject } from "loas3/dist/src/generated/full";
import { ISerializedRequest } from "../interfaces";

const RESTMethodTypes = [
  "get",
  "head",
  "post",
  "put",
  "delete",
  "options",
  "trace",
  "all", // internally used to mark all the above methods.
] as const;
export type HTTPMethod = typeof RESTMethodTypes[number];

export const isRESTMethod = (maybeMethod: string): maybeMethod is HTTPMethod =>
  RESTMethodTypes.toString().includes(maybeMethod.toLowerCase());

export interface IServiceMapping {
  [serviceName: string]: IService;
}

export interface IStateInput {
  method: HTTPMethod;
  endpoint: string;
  newState: IUnmockServiceState;
}
export interface IServiceInput {
  schema: OpenAPIObject;
  name: string;
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
   * Given an endpoint, checks if it is well defined in the service.
   * This is used to check and verify dynamic paths (i.e. use path parameters)
   * @param endpoint The endpoint to find in the OAS
   * @returns Either the correct path (with parameters if needed),
   *          or undefined if the path is not found.
   * @example findEndpoint("/pets/2") will return "/pets/{petId}"
   */
  findEndpoint(endpoint: string): string | undefined;
  /**
   * Verifies the given request for method and endpoint are valid.
   * Should throw if anything goes wrong.
   * @param method A string that matches HTTPMethod type.
   *               Note HTTPMethod includes an "all" method, intended as "whatever method fits".
   * @param endpoint An endpoint for fetching.
   *                 Note the default endpoint ("**") should match all endpoints.
   */
  verifyRequest(method: HTTPMethod, endpoint: string): void;
  /**
   * Updates the state for given method and endpoint.
   * @param input Describes the new state that matches a method and endpoint.
   */
  updateState(input: IStateInput): boolean;

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
