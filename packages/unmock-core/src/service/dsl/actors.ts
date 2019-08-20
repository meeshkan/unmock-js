import debug from "debug";
import { Schema } from "../interfaces";
import { SCHEMA_TIMES } from "./constants";
import { Actor, Props } from "./interfaces";
import { hasUnmockProperty } from "./utils";

const debugLog = debug("unmock:dsl:actors");

/*
 * Actors (actOn$X) are found here.
 * They modify the behaviour/schemas according to specific DSL instructions.
 * They all use the Actor type.
 */

/**
 * Acts on the $times argument in top level DSL by MODIFYING the original
 * schema as needed and returning a relevant copy.
 *
 * The value of $times is decreased by 1 and removed from the copied schema.
 * If the new value is less than 0 (i.e. this state has expired),
 * the content is **removed** from the original schema, and the returned object is empty.
 *
 * @param origState
 * @param mediaType
 */
const actOn$times: Actor = (origState: Schema) => {
  const origTimes = (origState.properties as Props)[SCHEMA_TIMES];
  const newTimes = origTimes.default - 1;
  const newState =
    newTimes > 0
      ? // Build a copy of the new state (with decremented $times) if still needed
        {
          ...origState,
          properties: {
            ...origState.properties,
            [SCHEMA_TIMES]: { ...origTimes, default: newTimes },
          },
        }
      : undefined;

  debugLog(
    `new state for ${JSON.stringify(origState)} is '${JSON.stringify(
      newState,
    )}'`,
  );

  const { properties, ...rest } = origState;
  const { [SCHEMA_TIMES]: unused, ...restProperties } = properties as Props;
  return {
    parsed:
      Object.keys(restProperties).length > 0
        ? { properties: restProperties, ...rest }
        : { ...rest },
    newState,
  };
};

export const actors: { [propertyName: string]: Actor } = {
  [SCHEMA_TIMES]: actOn$times,
};

export const actWithAllActors = (schema: Schema) =>
  Object.entries(actors).reduce(
    (
      {
        newState,
        parsed,
      }: { newState: Array<Schema | undefined>; parsed: Schema[] },
      [property, fn],
    ) => {
      if (hasUnmockProperty(schema, property)) {
        const result = fn(schema);
        return {
          newState: newState.concat(result.newState),
          parsed: parsed.concat(result.parsed),
        };
      }

      return { newState, parsed: parsed.concat(schema) };
    },
    { newState: [], parsed: [] },
  );
