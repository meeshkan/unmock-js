import debug from "debug";
import { Schema } from "../interfaces";
import { SCHEMA_TEXT, SCHEMA_TIMES } from "./constants";
import { buildUnmockPropety } from "./utils";

const debugLog = debug("unmock:dsl:translators");
/*
 * Translators (translate$X) are found here. They translate a DSL instruction to OAS, without modifying any schemas.
 */

export const translate$times = (times: any) => {
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

export const translate$text = (text: any) => {
  if (typeof text !== "string") {
    throw new Error("Can't set text/plain response to non-string value!");
  }
  return buildUnmockPropety(SCHEMA_TEXT, text);
};

/**
 * Translates the $size argument in the DSL, by verifying its location and value is logical.
 * @param state
 * @param schema
 */
export const translate$size = (state: any, schema: Schema): any => {
  // assumes state.$size exists
  if (schema.type === undefined || schema.type !== "array") {
    throw new Error("Can't set '$size' for non-array elements!");
  }
  if (typeof state.$size !== "number") {
    throw new Error("Can't request a non-numeric size of array!");
  }
  const nElements = Math.round(state.$size);
  if (nElements < 1) {
    throw new Error("Can't request a non-positive size of array!");
  }
  return { minItems: nElements, maxItems: nElements };
};
