import Ajv from "ajv";
import { DSL, filterTopLevelDSL, getTopLevelDSL } from "../dsl";
import {
  isSchema,
  IStateInputGenerator,
  Schema,
  UnmockServiceState,
} from "../interfaces";

// These are specific to OAS and not part of json schema standard
const ajv = new Ajv({ unknownFormats: ["int32", "int64"] });

export default (state?: UnmockServiceState): IStateInputGenerator => ({
  isEmpty: state === undefined || Object.keys(state).length === 0,
  top: getTopLevelDSL(state || {}),
  gen: (schema: Schema) =>
    spreadStateFromService(schema, filterTopLevelDSL(state || {})),
});

/**
 * Given a state request, finds the matching objects
 * within the schema that apply to the request. These
 * are fetched so that one can use the spread operator
 * to overwrite the default schema.
 * The state items are matched by identifying all corresponding
 * keys nested in the path leading to them.
 *
 * @param statePath A state being set in a service (or recursively-called, hence `any`)
 * @param serviceSchema The top-level (or recursely-called, hence `any`) schema for the service
 * @returns An object with string-keys leading to the location of matching state for each variable,
 *          with value being either the Schema defined for that variable, or null.
 * @throws  If a state path is defined in such a way, that the nested state isn't an object, string,
 *          number or boolean (i.e. `{ path: { to: { state: undefined } } }` )
 */
export const spreadStateFromService = (
  serviceSchema: any,
  statePath: any,
): { [pathKey: string]: any | null } => {
  let matches: { [key: string]: any } = {};

  for (const key of Object.keys(statePath)) {
    const scm = serviceSchema[key];
    const stateValue = statePath[key];

    if (scm === undefined) {
      if (hasNestedItems(serviceSchema)) {
        // Option 1: current schema has no matching key, but contains indirection (items/properties, etc)
        // `statePath` at this point may also contain DSL elements, so we parse them before moving onwards
        const translated = DSL.translateDSLToOAS(statePath, serviceSchema);
        const spread = {
          ...oneLevelOfIndirectNestedness(serviceSchema, statePath),
          ...translated,
        };
        if (Object.keys(spread).length === 0) {
          spread[key] = null;
        }
        matches = { ...matches, ...spread };
      }
    } else if (scm !== undefined) {
      if (isConcreteValue(stateValue)) {
        // Option 2: Current scheme has matching key, and the state specifies a non-object (or schema). Validate schema.
        // TODO do we want to throw for invalid types?
        const spread = {
          [key]:
            isSchema(scm) && ajv.validate(scm, stateValue) ? stateValue : null,
        };
        matches = { ...matches, ...spread };
      } else if (hasNestedItems(scm) || isNonEmptyObject(scm)) {
        // Option 3: Current scheme has matching key, state specifies an object - traverse schema and indirection
        // `stateValue` at this point may also contain DSL elements, so we parse them before moving onwards
        const translated = DSL.translateDSLToOAS(stateValue, scm);
        const spread = {
          [key]: { ...spreadStateFromService(scm, stateValue), ...translated },
        };
        matches = {
          ...matches,
          ...oneLevelOfIndirectNestedness(scm, statePath, spread),
        };
      } else {
        // Option 4: Current schema has matching key, but state specifies an object and schema has final value
        matches[key] = null;
      }
    } else {
      throw new Error(
        `${statePath[key]} (object '${JSON.stringify(
          statePath,
        )}' with key '${key}') is not an object, string, number or boolean!`,
      );
    }
  }
  return matches;
};

// Items that hold nested contents in OAS
const NESTED_SCHEMA_ITEMS = ["properties", "items", "additionalProperties"];

const hasNestedItems = (obj: any) =>
  NESTED_SCHEMA_ITEMS.some((key: string) => obj[key] !== undefined);

const isConcreteValue = (obj: any) =>
  ["string", "number", "boolean"].includes(typeof obj);

const isNonEmptyObject = (obj: any) =>
  typeof obj === "object" && Object.keys(obj).length > 0;

const oneLevelOfIndirectNestedness = (
  schema: any,
  path: any,
  internalObj: { [key: string]: any } = {},
) => {
  for (const key of NESTED_SCHEMA_ITEMS) {
    if (schema[key] !== undefined) {
      const maybeContents = spreadStateFromService(schema[key], path);
      if (
        maybeContents !== undefined &&
        Object.keys(maybeContents).length > 0
      ) {
        internalObj[key] = maybeContents;
      }
    }
  }
  return internalObj;
};
