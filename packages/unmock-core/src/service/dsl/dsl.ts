import { cloneDeep } from "lodash";
import {
  codeToMedia,
  isReference,
  mediaTypeToSchema,
  Schema,
} from "../interfaces";
import { ITopLevelDSL } from "./interfaces";

type Props = Record<string, Schema>;
const SCHEMA_TIMES = "x-unmock-times";
const UNMOCK_TYPE = "unmock";
const buildUnmockProperty = (type: string, value: any) => ({
  [type]: { type: UNMOCK_TYPE, default: value },
});
const hasUnmockProperty = (schema: Schema, type: string) => {
  if (schema.properties === undefined) {
    return false;
  }
  const prop = schema.properties[type];
  if (prop === undefined || isReference(prop)) {
    return false;
  }
  return prop.type === UNMOCK_TYPE;
};

export class DSL {
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
  ) {
    if (responses === undefined) {
      return responses;
    }
    // Handles top-level schema and injects the literals to responses.
    // $code is a special case, handled outside this function (acts as a key and not a value)
    if (top.$times !== undefined) {
      const times = Math.round(top.$times); // We ignore floats by rounding to an integer
      if (times < 1) {
        throw new Error(`Can't set response $times to ${times}!`);
      }
      Object.values(responses).forEach((response: mediaTypeToSchema) => {
        Object.values(response).forEach((schema: Schema) => {
          schema.properties = {
            ...schema.properties,
            ...buildUnmockProperty(SCHEMA_TIMES, times),
          };
        });
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
  public static actTopLevelFromOAS(states: codeToMedia) {
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
          handleTimes(copy[code], states[code], mediaType);
        }
        if (Object.keys(schema.properties).length === 0) {
          // we deleted all the keys from properties!
          delete schema.properties;
        }
      }
    }
    return copy;
  }
}

const handleTimes = (
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
    // Delete the entire state!
    delete copiedSchema[mediaType];
    delete originalSchema[mediaType];
  }
};
