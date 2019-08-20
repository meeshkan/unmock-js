import { Schema } from "../interfaces";

/**
 * DSL related parameters that can only be found at the top level
 */
// Defines a mapping for top level DSL keys, to be used with different providers
export const TopLevelDSLKeys: { [DSLKey: string]: string } = {
  $code: "number",
  $times: "number",
} as const;

export interface ITopLevelDSL {
  /**
   * Defines the response based on the requested response code.
   * If the requested response code is not found, returns 'default'
   */
  $code?: number;
  $times?: number;
  [DSLKey: string]: any;
}

/**
 * DSL related parameters that can be found at any level in the schema
 */

export const DSLKeys = [...Object.keys(TopLevelDSLKeys), "$size"];

export interface IDSL {
  /**
   * Used to control and generate arrays of specific sizes.
   */
  $size?: number;
  [key: string]: number | string | boolean | undefined;
}

export type Props = Record<string, Schema>;

export interface IUnmockProperty {
  [key: string]: {
    type: string;
    default: any;
  };
}

/**
 * Stuff for general DSL submodule
 */

export type Actor = (
  originalSchema: Schema,
) => { parsed: Schema; newState: Schema | undefined };
export type Translator = (state: any, schema: Schema) => any;
export type TopTranslator = (value: any) => any;
