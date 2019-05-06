export type IJSONPrimitive = string | number | boolean | null;
export type IJSONValue = IJSONPrimitive | IJSONObject | IJSONArray;
export interface IJSONObject {
  [key: string]: IJSONPrimitive;
}
export interface IJSONArray extends Array<IJSONValue> {}
