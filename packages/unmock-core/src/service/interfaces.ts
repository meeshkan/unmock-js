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
} from "loas3/dist/src/generated/full";

const RESTMethodTypes = [
  "get",
  "head",
  "post",
  "put",
  "patch",
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
  /**
   * Whether or not the given state is actually empty
   */
  isEmpty: boolean;
  /**
   * Generates a new state (copy) based on the given schema, so that
   * future processes can use it without modifying the original schema.
   */
  gen: (schema: Schema) => Record<string, Schema> | Schema;
  /**
   * Returns top-level DSL, if it exists.
   */
  top: ITopLevelDSL;
}
export const isStateInputGenerator = (u: any): u is IStateInputGenerator =>
  u !== undefined &&
  u.top !== undefined &&
  u.gen !== undefined &&
  typeof u.gen === "function";

export type Dereferencer = <T>(obj: any) => T;

export interface IStateInput {
  method: ExtendedHTTPMethod;
  endpoint: string;
  newState: IStateInputGenerator;
}
export interface IServiceInput {
  schema: OpenAPIObject;
  name: string;
  absPath?: string;
}

// maps from media types (e.g. "application/json") to schema
export type mediaTypeToSchema = Record<string, Schema>;
// maps from status to mediaTypeToSchema
export type codeToMedia = Record<string, mediaTypeToSchema>;

export type MatcherResponse =
  | { operation: Operation; state: codeToMedia | undefined; service: IService }
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
   * Holds the absolute path where the service specification resides.
   */
  readonly absPath: string;

  /**
   * Used to dereference items in the schema when needed
   */
  readonly dereferencer: Dereferencer;

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

export interface IUnmockServiceState
  extends INestedState<
    IDSL | string | number | (() => string | number) | undefined | boolean
  > {}

/**
 * Defines how a state can look like without validation against
 * the actual service specification.
 * Validation can be done either in runtime or via IDE extensions.
 */
export type UnmockServiceState = IUnmockServiceState & ITopLevelDSL | IDSL;

// ##########################
// Type definitions for the Proxy class used to wrap the State Store.
// ##########################

// Used to define the simplify the types used
type FluentStateStore = StateStoreType & SetStateForSpecificMethod;
type StateInput = IStateInputGenerator | UnmockServiceState;

// Used to incorporate the reset method when needed
interface IResetState {
  /**
   * Resets the state for the current service, or for the entire state store.
   * You may not continue using the fluent API after this call.
   */
  reset(): void;
}

// Manually sync'd with HTTPMethod: ["get", "head", "post", "put", "patch", "delete", "options", "trace"]
type SetStateForSpecificMethod = {
  /**
   * Sets the given state for all GET endpoints in the current service, for which the state can be applied.
   * @param state An object setting the state or a DSL transformer used to set it.
   * @throws If the given state cannot be applied to any GET endpoint, or if no GET endpoints exist.
   */
  get(state: StateInput): FluentStateStore;
  /**
   * Sets the given state for the given GET endpoint (or matching endpoints if using a glob pattern).
   * @param {string} endpoint Desired endpoint for the state.
   *   You may use single asterisks for single path item replacement.
   *   Example: If a service specified an endpoint '/pets/{pet_id}/name',
   *            an asterisk may be used instead of {pet_id} or a specific id.
   * @param state An object setting the state or a DSL transformer used to set it.
   * @throws If the state cannot be applied to the given endpoint, or if the endpoint does not specify a GET operation.
   */
  get(endpoint: string, state: StateInput): FluentStateStore;

  /**
   * Sets the given state for all HEAD endpoints in the current service, for which the state can be applied.
   * @param state An object setting the state or a DSL transformer used to set it.
   * @throws If the given state cannot be applied to any HEAD endpoint, or if no HEAD endpoints exist.
   */
  head(state: StateInput): FluentStateStore;
  /**
   * Sets the given state for the given HEAD endpoint (or matching endpoints if using a glob pattern).
   * @param {string} endpoint Desired endpoint for the state.
   *   You may use single asterisks for single path item replacement.
   *   Example: If a service specified an endpoint '/pets/{pet_id}/name',
   *            an asterisk may be used instead of {pet_id} or a specific id.
   * @param state An object setting the state or a DSL transformer used to set it.
   * @throws If the state cannot be applied to the given endpoint, or if the endpoint does not specify a HEAD operation.
   */
  head(endpoint: string, state: StateInput): FluentStateStore;

  /**
   * Sets the given state for all POST endpoints in the current service, for which the state can be applied.
   * @param state An object setting the state or a DSL transformer used to set it.
   * @throws If the given state cannot be applied to any POST endpoint, or if no POST endpoints exist.
   */
  post(state: StateInput): FluentStateStore;
  /**
   * Sets the given state for the given POST endpoint (or matching endpoints if using a glob pattern).
   * @param {string} endpoint Desired endpoint for the state.
   *   You may use single asterisks for single path item replacement.
   *   Example: If a service specified an endpoint '/pets/{pet_id}/name',
   *            an asterisk may be used instead of {pet_id} or a specific id.
   * @param state An object setting the state or a DSL transformer used to set it.
   * @throws If the state cannot be applied to the given endpoint,
   *         or if the endpoint does not specify a POST operation.
   */
  post(endpoint: string, state: StateInput): FluentStateStore;

  /**
   * Sets the given state for all PUT endpoints in the current service, for which the state can be applied.
   * @param state An object setting the state or a DSL transformer used to set it.
   * @throws If the given state cannot be applied to any PUT endpoint,
   *         or if no PUT endpoints exist.
   */
  put(state: StateInput): FluentStateStore;
  /**
   * Sets the given state for the given PUT endpoint (or matching endpoints if using a glob pattern).
   * @param {string} endpoint Desired endpoint for the state.
   *   You may use single asterisks for single path item replacement.
   *   Example: If a service specified an endpoint '/pets/{pet_id}/name',
   *            an asterisk may be used instead of {pet_id} or a specific id.
   * @param state An object setting the state or a DSL transformer used to set it.
   * @throws If the state cannot be applied to the given endpoint,
   *         or if the endpoint does not specify a PUT operation.
   */
  put(endpoint: string, state: StateInput): FluentStateStore;

  /**
   * Sets the given state for all PATCH endpoints in the current service, for which the state can be applied.
   * @param state An object setting the state or a DSL transformer used to set it.
   * @throws If the given state cannot be applied to any PATCH endpoint,
   *         or if no PATCH endpoints exist.
   */
  patch(state: StateInput): FluentStateStore;
  /**
   * Sets the given state for the given PATCH endpoint (or matching endpoints if using a glob pattern).
   * @param {string} endpoint Desired endpoint for the state.
   *   You may use single asterisks for single path item replacement.
   *   Example: If a service specified an endpoint '/pets/{pet_id}/name',
   *            an asterisk may be used instead of {pet_id} or a specific id.
   * @param state An object setting the state or a DSL transformer used to set it.
   * @throws If the state cannot be applied to the given endpoint,
   *         or if the endpoint does not specify a PATCH operation.
   */
  patch(endpoint: string, state: StateInput): FluentStateStore;

  /**
   * Sets the given state for all DELETE endpoints in the current service, for which the state can be applied.
   * @param state An object setting the state or a DSL transformer used to set it.
   * @throws If the given state cannot be applied to any DELETE endpoint, or if no DELETE endpoints exist.
   */
  delete(state: StateInput): FluentStateStore;
  /**
   * Sets the given state for the given DELETE endpoint (or matching endpoints if using a glob pattern).
   * @param {string} endpoint Desired endpoint for the state.
   *   You may use single asterisks for single path item replacement.
   *   Example: If a service specified an endpoint '/pets/{pet_id}/name',
   *            an asterisk may be used instead of {pet_id} or a specific id.
   * @param state An object setting the state or a DSL transformer used to set it.
   * @throws If the state cannot be applied to the given endpoint,
   *         or if the endpoint does not specify a DELETE operation.
   */
  delete(endpoint: string, state: StateInput): FluentStateStore;

  /**
   * Sets the given state for all OPTIONS endpoints in the current service, for which the state can be applied.
   * @param state An object setting the state or a DSL transformer used to set it.
   * @throws If the given state cannot be applied to any OPTIONS endpoint, or if no OPTIONS endpoints exist.
   */
  options(state: StateInput): FluentStateStore;
  /**
   * Sets the given state for the given OPTIONS endpoint (or matching endpoints if using a glob pattern).
   * @param {string} endpoint Desired endpoint for the state.
   *   You may use single asterisks for single path item replacement.
   *   Example: If a service specified an endpoint '/pets/{pet_id}/name',
   *            an asterisk may be used instead of {pet_id} or a specific id.
   * @param state An object setting the state or a DSL transformer used to set it.
   * @throws If the state cannot be applied to the given endpoint,
   *         or if the endpoint does not specify a OPTIONS operation.
   */
  options(endpoint: string, state: StateInput): FluentStateStore;

  /**
   * Sets the given state for all TRACE endpoints in the current service, for which the state can be applied.
   * @param state An object setting the state or a DSL transformer used to set it.
   * @throws If the given state cannot be applied to any TRACE endpoint, or if no TRACE endpoints exist.
   */
  trace(state: StateInput): FluentStateStore;
  /**
   * Sets the given state for the given TRACE endpoint (or matching endpoints if using a glob pattern).
   * @param {string} endpoint Desired endpoint for the state.
   *   You may use single asterisks for single path item replacement.
   *   Example: If a service specified an endpoint '/pets/{pet_id}/name',
   *            an asterisk may be used instead of {pet_id} or a specific id.
   * @param state An object setting the state or a DSL transformer used to set it.
   * @throws If the state cannot be applied to the given endpoint,
   *         or if the endpoint does not specify a TRACE operation.
   */
  trace(endpoint: string, state: StateInput): FluentStateStore;
} & IResetState;

// Used for service-general state setups
type SetStateForAllPaths =
  /**
   * Sets the given state for all endpoints in the current service, for which the state can be applied.
   * @param state An object setting the state or a DSL transformer used to set it.
   * @throws If the given state cannot be applied to any endpoint.
   */
  (state: StateInput) => FluentStateStore;

type SetStateForMatchingEndpoint =
  /**
   * Sets the given state for the given endpoint (or matching endpoints if using a glob pattern).
   * @param {string} endpoint Desired endpoint for the state.
   *   You may use single asterisks for single path item replacement.
   *   Example: If a service specified an endpoint '/pets/{pet_id}/name',
   *            an asterisk may be used instead of {pet_id} or a specific id.
   * @param state An object setting the state or a DSL transformer used to set it.
   * @throws If the state cannot be applied to the given endpoint.
   */
  (endpoint: string, state: StateInput) => FluentStateStore;

export type StateStoreType = {
  // Has either `reset()` function or string signature with function call
  [serviceName: string]: SetStateForAllPaths &
    SetStateForMatchingEndpoint &
    SetStateForSpecificMethod;
} & IResetState;
