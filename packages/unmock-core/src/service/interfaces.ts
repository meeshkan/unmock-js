export type IOASMappingGenerator = () => { [key: string]: OASSchema };

export interface IStateMapping {
  [key: string]: any;
}

// Type aliases for brevity
export type OASSchema = any;
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
