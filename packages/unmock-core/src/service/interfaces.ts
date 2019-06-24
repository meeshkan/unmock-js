export type IOASMappingGenerator = () => { [key: string]: OASSchema };

export interface IStateMapping {
  [key: string]: any;
}

// Type aliases for brevity
export type OASSchema = any;
export type HTTPMethod =
  | "get"
  | "head"
  | "post"
  | "post"
  | "put"
  | "delete"
  | "connect"
  | "options"
  | "trace"
  | "all"; // Last one is internally used to mark all the above methods.
