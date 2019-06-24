export type IOASMappingGenerator = () => ServiceMapping;

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

export type ServiceMapping = { [serviceName: string]: OASSchema };

export interface IUnmockServiceState {
  // Defines basic DSL properties
  $code: number;
  [key: string]: UnmockServiceState;
}

// Type aliases for brevity
export type UnmockServiceState = any;
export type OASSchema = any;
