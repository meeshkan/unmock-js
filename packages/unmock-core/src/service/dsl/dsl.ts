import debug from "debug";
import { cloneDeep } from "lodash";
import {
  codeToMedia,
  isReference,
  mediaTypeToSchema,
  Schema,
} from "../interfaces";
import { ITopLevelDSL } from "./interfaces";

const debugLog = debug("unmock:dsl");

type Props = Record<string, Schema>;
const SCHEMA_PREFIX = "x-unmock-";
const SCHEMA_TIMES = `${SCHEMA_PREFIX}times`;
const UNMOCK_TYPE = "unmock";
interface IUnmockProperty {
  [key: string]: {
    type: string;
    default: any;
  };
}

/**
 * Every proper unmock property is an object of type `UNMOCK_TYPE` with the value set in `default`
 * @param name
 * @param value
 */
const buildUnmockPropety = (name: string, value: any) => ({
  [name]: { type: UNMOCK_TYPE, default: value },
});

/**
 * Modifies responses in-place by injecting the given `unmockProperty` to every response's `properties`
 * @param responses
 * @param unmockProperty
 */
const injectUnmockProperty = (
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
const hasUnmockProperty = (schema: Schema, name: string) => {
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

/**
 * Used with STRICT_MODE to enable throwing or ignoring errors and logging them as they happen.
 * @param fn
 */
const throwOnErrorIfStrict = (fn: () => void) => {
  try {
    fn();
  } catch (e) {
    if (DSL.STRICT_MODE) {
      throw e;
    }
    debugLog(e.message);
  }
};

/**
 * Handles DSL arguments by translating them to OAS where needed.
 * Many of these static functions modify their inputs to abstract away
 * the DSL from the final output (after having it translated/acted upon).
 */
export abstract class DSL {
  /**
   * If true, mismatching arguments will throw
   *    (e.g. `$size: a`, `$size: 0.1` (rounds to 0), `$size: N` with non-array type)
   * If false, these arguments are considered "as if" when they don't match the schema.
   */
  public static STRICT_MODE = true;

  /**
   * Translated DSL instructions in `state` to OAS, based on `schema`.
   * Modifies `state` in-place by removing the relevant DSL instructions.
   * @param state
   * @param schema
   * @returns A translated list of arguments.
   */
  public static translateDSLToOAS(state: any, schema: Schema): any {
    let translated: { [OASKey: string]: string | number | boolean } = {};
    if (state.$size !== undefined) {
      throwOnErrorIfStrict(() => {
        translated = { ...translated, ...translate$size(state, schema) };
        delete state.$size;
      });
    }
    return translated;
  }
  /**
   * Replaces top-level DSL elements in `top` with injected OAS items in every `response` in `responses`.
   * Objects injected are always prefixed with `x-unmock-`, and have a `type` equal to `unmock`, with the
   * relevant value being stored in `default`.
   * @param top
   * @param responses
   */
  public static translateTopLevelToOAS(
    top: ITopLevelDSL,
    responses: codeToMedia | undefined,
  ): codeToMedia | undefined {
    if (responses === undefined) {
      return responses;
    }
    // Handles top-level schema and injects the literals to responses.
    // $code is a special case, handled outside this function (acts as a key and not a value)
    if (top.$times !== undefined) {
      throwOnErrorIfStrict(() => {
        const translated = translate$times(top.$times);
        injectUnmockProperty(responses, translated);
      });
    }
    return responses;
  }

  /**
   * Given a state that potentially contains top level DSL instructions in OAS,
   * acts on those DSL instructions as needed and returns a copy of the given state.
   * The relevant top level DSL instructions are removed from the returned copy.
   * @param states
   */
  public static actTopLevelFromOAS(states: codeToMedia): codeToMedia {
    const copy: codeToMedia = {};
    for (const code of Object.keys(states)) {
      copy[code] = {};
      for (const mediaType of Object.keys(states[code])) {
        copy[code][mediaType] = cloneDeep(states[code][mediaType]);
        const schema = copy[code][mediaType];
        if (schema.properties === undefined) {
          continue;
        }
        if (hasUnmockProperty(schema, SCHEMA_TIMES)) {
          actOn$times(copy[code], states[code], mediaType);
        }
        if (Object.keys(schema.properties).length === 0) {
          debugLog(
            `schema.properties is now empty, removing 'properties' from copied response '${code}/${mediaType}'`,
          );
          delete schema.properties;
          if (Object.keys(schema).length === 0) {
            debugLog(
              `schema is now empty, removing '${mediaType}' from copied response '${code}'`,
            );
            delete copy[code][mediaType];
          }
        }
      }
      if (Object.keys(copy[code]).length === 0) {
        debugLog(
          `Entire response is empty, removing '${code}' from copied response`,
        );
        delete copy[code];
      }
    }
    return copy;
  }
}

/*
 * Handlers (actOn$X) are found here. They modify the behaviour/schemas according to specific DSL instructions.
 */

/**
 * Acts on the $times argument in top level DSL by synchronizing and modifying the copied and original schemas.
 * The value of $times is decreased by 1 and removed from the copied schema.
 * If the new value is less than 0 (i.e. this state has expired),
 * the content is removed from **both** the copied and original schemas.
 * @param copiedSchema
 * @param originalSchema
 * @param mediaType
 */
const actOn$times = (
  copiedSchema: mediaTypeToSchema,
  originalSchema: mediaTypeToSchema,
  mediaType: string,
) => {
  // update the default value
  const origTimes = (originalSchema[mediaType].properties as Props)[
    SCHEMA_TIMES
  ];
  origTimes.default -= 1;
  // delete value in copy (for clean return)
  delete (copiedSchema[mediaType].properties as Props)[SCHEMA_TIMES];
  if (origTimes.default < 0) {
    debugLog(
      `$times has expired for '${mediaType}', removing state in both copied and original`,
    );
    delete copiedSchema[mediaType];
    delete originalSchema[mediaType];
  }
};

/*
 * Translators (translate$X) are found here. They translate a DSL instruction to OAS, without modifying any schemas.
 */

const translate$times = (times: any) => {
  if (typeof times !== "number") {
    throw new Error("Can't set response $times with non-numeric value!");
  }
  const roundTimes = Math.round(times); // We ignore floats by rounding to an integer
  if (roundTimes < 1) {
    throw new Error(`Can't set response $times to ${times}!`);
  }
  debugLog(`Rounded response $times to ${times}`);
  return buildUnmockPropety(SCHEMA_TIMES, times);
};

/**
 * Translates the $size argument in the DSL, by verifying its location and value is logical.
 * @param state
 * @param schema
 */
const translate$size = (state: any, schema: Schema): any => {
  // assumes state.$size exists
  if (schema.type === undefined || schema.type !== "array") {
    throw new Error("Can't set '$size' for non-array elements!");
  }
  if (typeof state.$size !== "number") {
    throw new Error("Can't request a non-number size of array!");
  }
  const nElements = Math.round(state.$size);
  if (nElements < 0) {
    throw new Error("Can't request a non-positive size of array!");
  }
  return { minItems: nElements, maxItems: nElements };
};
