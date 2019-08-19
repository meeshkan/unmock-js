import debug from "debug";
import { cloneDeep, defaultsDeep } from "lodash";
import { codeToMedia, mediaTypeToSchema, Schema } from "../interfaces";
import { actors } from "./actors";
import { ITopLevelDSL } from "./interfaces";
import { topTranslators, translators } from "./translators";
import { hasUnmockProperty, injectUnmockProperty } from "./utils";

const debugLog = debug("unmock:dsl");

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
  public static replaceDSLWithOAS(state: any, schema: Schema): any {
    return Object.entries(translators).reduce((obj, [property, fn]) => {
      if (state[property] !== undefined) {
        const translated = fn(state, schema);
        const result = { ...obj, ...translated };
        if (translated !== undefined) {
          delete state[property];
        }
        return result;
      }
      return obj;
    }, {});
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
    Object.keys(topTranslators)
      .filter(dslKey => top[dslKey] !== undefined)
      .map(dslKey => topTranslators[dslKey](top[dslKey]))
      .filter(translation => translation !== undefined)
      .forEach(translation => injectUnmockProperty(responses, translation));
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
      copy[code] = Object.keys(states[code]).reduce(
        (obj, mediaType) => ({
          ...obj,
          [mediaType]: actOnSchema(states[code], mediaType),
        }),
        {},
      );
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

const actOnSchema = (
  schema: mediaTypeToSchema,
  mediaType: string,
): Record<string, Schema> => {
  const [trg, ...rest] = Object.entries(actors).map(([property, fn]) =>
    hasUnmockProperty(schema[mediaType], property)
      ? fn(schema, mediaType)
      : cloneDeep(schema[mediaType]),
  );
  const result = defaultsDeep(trg, rest);

  const maybeProperties = result.properties;
  if (
    maybeProperties !== undefined &&
    Object.keys(maybeProperties).length === 0
  ) {
    debugLog(
      `schema.properties is now empty, removing 'properties' from copied response '${mediaType}'`,
    );
    delete result.properties;
  }

  return result;
};
