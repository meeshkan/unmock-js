import debug from "debug";
import { cloneDeep } from "lodash";
import { codeToMedia, Schema } from "../interfaces";
import { actOn$times } from "./actors";
import { SCHEMA_TIMES } from "./constants";
import { ITopLevelDSL } from "./interfaces";
import { translate$size, translate$times } from "./translators";
import {
  hasUnmockProperty,
  injectUnmockProperty,
  throwOnErrorIfStrict,
} from "./utils";

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
