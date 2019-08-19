import debug from "debug";
import { mediaTypeToSchema } from "../interfaces";
import { SCHEMA_TIMES } from "./constants";
import { Actor, Props } from "./interfaces";

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
 * @param originalSchema
 * @param mediaType
 */
const actOn$times: Actor = (
  originalSchema: mediaTypeToSchema,
  mediaType: string,
) => {
  // update the default value
  const origTimes = (originalSchema[mediaType].properties as Props)[
    SCHEMA_TIMES
  ];
  origTimes.default -= 1;
  if (origTimes.default < 0) {
    debugLog(
      `$times has expired for '${JSON.stringify(
        originalSchema,
      )}', removing state in original schema`,
    );
    delete originalSchema[mediaType];
    return {};
  }
  const { properties, ...rest } = originalSchema[mediaType];
  const { [SCHEMA_TIMES]: _, ...restProperties } = properties as Props;
  return { properties: restProperties, ...rest };
};

export const actors: { [propertyName: string]: Actor } = {
  [SCHEMA_TIMES]: actOn$times,
};
