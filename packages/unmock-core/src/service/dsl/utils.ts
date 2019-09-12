import debug from "debug";
import {
  codeToMedia,
  isReference,
  mediaTypeToSchema,
  Schema,
  UnmockServiceState,
} from "../interfaces";
import { UNMOCK_TYPE } from "./constants";
import { DSL } from "./dsl";
import { IUnmockProperty, TopLevelDSLKeys } from "./interfaces";

const debugLog = debug("unmock:dsl:utils");

export const getTopLevelDSL = (state: UnmockServiceState) =>
  Object.keys(state)
    .filter(
      (key: string) =>
        TopLevelDSLKeys[key] !== undefined && TopLevelDSLKeys[key](state[key]),
    )
    .reduce((a, b) => ({ ...a, [b]: state[b] }), {});

export const filterTopLevelDSL = (state: UnmockServiceState) =>
  Object.keys(state)
    .filter(
      (key: string) =>
        TopLevelDSLKeys[key] === undefined || !TopLevelDSLKeys[key](state[key]),
    )
    .reduce((a, b) => ({ ...a, [b]: state[b] }), {});

export const throwOnErrorIfStrict = (fn: () => any) => {
  try {
    return fn();
  } catch (e) {
    if (DSL.STRICT_MODE) {
      throw e;
    }
    return undefined;
  }
};

/**
 * Every proper unmock property is an object of type `UNMOCK_TYPE` with the value set in `default`
 * @param name
 * @param value
 */
export const buildUnmockPropety = (name: string, value: any) => ({
  [name]: { type: UNMOCK_TYPE, default: value },
});

/**
 * Modifies responses in-place by injecting the given `unmockProperty` to every response's `properties`
 * @param responses
 * @param unmockProperty
 */
export const injectUnmockProperty = (
  responses: codeToMedia,
  unmockProperty: IUnmockProperty,
) => {
  Object.values(responses).forEach((response: mediaTypeToSchema) => {
    Object.values(response).forEach((schema: Schema) => {
      schema.properties = {
        ...schema.properties,
        ...unmockProperty,
      };
    });
  });
};

/**
 * Checks if given schema has the given unmock property with given `name`
 * @param schema
 * @param name
 */
export const hasUnmockProperty = (schema: Schema, name: string) => {
  const log = (found: boolean) =>
    debugLog(
      `${found ? "Found" : "Can't find"} '${name}' in ${JSON.stringify(
        schema,
      )}`,
    );
  if (schema.properties === undefined) {
    log(false);
    return false;
  }
  const prop = schema.properties[name];
  if (prop === undefined || isReference(prop)) {
    log(false);
    return false;
  }
  log(prop.type === UNMOCK_TYPE);
  return prop.type === UNMOCK_TYPE;
};
