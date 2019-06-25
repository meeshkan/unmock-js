export type IOASMappingGenerator = () => IServiceMapping;

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
  [serviceName: string]: OASSchema;
}

export interface IUnmockServiceState {
  // Defines basic DSL properties
  $code: number;
  [key: string]: UnmockServiceState;
}

export interface IService {
  schema: OASSchema;
  hasDefinedPaths: boolean;
  findEndpoint(endpoint: string): string | undefined;
  verifyRequest(method: HTTPMethod, endpoint: string): void;
  updateState(input: {
    method: HTTPMethod;
    endpoint: string;
    newState: IUnmockServiceState;
  }): boolean;
}

// Type aliases for brevity
export type UnmockServiceState = any;
export type OASSchema = any;
