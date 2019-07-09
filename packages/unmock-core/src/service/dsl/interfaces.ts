/**
 * DSL related parameters that can only be found at the top level
 */
export interface ITopLevelDSL {
  /**
   * Defines the response based on the requested response code.
   * If the requested response code is not found, returns 'default'
   */
  $code?: number;
  $times?: number;
}

/**
 * DSL related parameters that can be found at any level in the schema
 */
export interface IDSL {
  /**
   * Used to control and generate arrays of specific sizes.
   */
  $size?: number;
  [key: string]: number | string | boolean | undefined;
}
