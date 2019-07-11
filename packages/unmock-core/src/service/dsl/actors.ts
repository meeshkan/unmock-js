import debug from "debug";
import { mediaTypeToSchema } from "../interfaces";
import { SCHEMA_TEXT, SCHEMA_TIMES } from "./constants";
import { Props } from "./interfaces";

const debugLog = debug("unmock:dsl:actors");

/*
 * Actors (actOn$X) are found here. They modify the behaviour/schemas according to specific DSL instructions.
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
export const actOn$times = (
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

export const actOn$text = (copiedSchema: mediaTypeToSchema) => {
  for (const mediaType of Object.keys(copiedSchema)) {
    const isStringType = copiedSchema[mediaType].type === "string";
    const value = (copiedSchema[mediaType].properties as Props)[SCHEMA_TEXT];
    // Remove the property from the schema
    delete (copiedSchema[mediaType].properties as Props)[SCHEMA_TEXT];
    if (isStringType) {
      // Using JSF 'const' to generate constant values.
      (copiedSchema[mediaType] as any).const = value.default;
    }
  }
};
