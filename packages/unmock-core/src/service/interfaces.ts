const RESTMethodTypes = [
  "get",
  "head",
  "post",
  "put",
  "delete",
  "connect",
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

export interface IUnmockServiceState {
  // Defines basic DSL properties
  $code: number;
  [key: string]: UnmockServiceState;
}

export interface IService {
  /**
   * Holds the OpenAPI Schema object (refered to as OAS).
   */
  schema: OASSchema;
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
}

// Type aliases for brevity
export type UnmockServiceState = any;
export type OASSchema = any;
export interface IStateInput {
  method: HTTPMethod;
  endpoint: string;
  newState: IUnmockServiceState;
}
export interface IServiceInput {
  schema: OASSchema;
  name: string;
}
