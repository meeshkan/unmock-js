import debug from "debug";
import { defaultsDeep } from "lodash";
import { codeToMedia, mediaTypeToSchema, Schema } from "../interfaces";
import { actWithAllActors } from "./actors";
import { ITopLevelDSL } from "./interfaces";
import { topTranslators, translators } from "./translators";
import { injectUnmockProperty } from "./utils";

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
   * Translates DSL instructions in `state` to OAS, based on `schema`.
   * @param state
   * @param schema
   * @returns An object with the translations and a cleaned state without translation-specific keywords
   */
  public static translateDSLToOAS(
    state: any,
    schema: Schema,
  ): { translated: any; cleaned: any } {
    return Object.entries(translators).reduce(
      ({ translated, cleaned }, [property, fn]) => {
        const { [property]: maybeUsed, ...rest } = cleaned;
        const newTranslation =
          maybeUsed !== undefined ? fn(cleaned, schema) : undefined;
        return newTranslation !== undefined
          ? { translated: newTranslation, cleaned: rest }
          : { translated, cleaned };
      },
      { translated: {}, cleaned: state },
    );
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
      .filter(
        dslKey => top[dslKey] !== undefined /* only valid top-level DSL keys */,
      )
      .map(
        dslKey => topTranslators[dslKey](top[dslKey]) /* get the translation */,
      )
      .filter(
        translation =>
          translation !== undefined /* no undefined translations */,
      )
      .forEach(
        translation =>
          injectUnmockProperty(responses, translation) /* add to responses */,
      );
    return responses;
  }

  /**
   * Given a state that potentially contains top level DSL instructions in OAS,
   * acts on those DSL instructions as needed and returns a copy of the given state.
   * The relevant top level DSL instructions are removed from the returned copy.
   * @param states
   */
  public static actTopLevelFromOAS(
    states: codeToMedia,
  ): { parsed: codeToMedia; newState: codeToMedia } {
    return reduceAndHoistElements(states, (mToS: mediaTypeToSchema) =>
      reduceAndHoistElements(mToS, actOnSchema),
    );
  }
}

/**
 * Used to reduce the given `iterable` by running `callable` on every element,
 * and hoisting `parsed` and `newState` from that operation.
 * @param iterable
 * @param callable
 */
const reduceAndHoistElements = (
  iterable: { [key: string]: any },
  callable: (value: any) => { parsed: any; newState: any },
) =>
  Object.keys(iterable)
    .map(key => ({ name: key, ...callable(iterable[key]) }))
    .reduce(
      ({ parsed, newState }, o) => ({
        parsed: { ...parsed, [o.name]: o.parsed },
        newState: { ...newState, [o.name]: o.newState },
      }),
      {
        parsed: {},
        newState: {},
      },
    );

const actOnSchema = (
  schema: Schema,
): { parsed: Schema; newState: Schema | undefined } => {
  const newStateAndResult = actWithAllActors(schema);

  const parsed = defaultsDeep({}, ...newStateAndResult.parsed);
  const newState = newStateAndResult.newState.includes(undefined) // undefined means state is marked for deletion
    ? undefined
    : defaultsDeep({}, ...newStateAndResult.newState);

  const maybeProperties = parsed.properties;
  if (
    maybeProperties !== undefined &&
    Object.keys(maybeProperties).length === 0
  ) {
    debugLog(
      `schema.properties is now empty, removing 'properties' from copied response '${JSON.stringify(
        schema,
      )}'`,
    );
    delete parsed.properties;
  }

  return { parsed, newState };
};
