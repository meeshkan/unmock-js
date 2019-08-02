import Ajv from "ajv";
import debug from "debug";
import { ISerializedRequest } from "../../interfaces";
import { DSL, filterTopLevelDSL, getTopLevelDSL, ITopLevelDSL } from "../dsl";
import {
  isSchema,
  IStateInputGenerator,
  Schema,
  UnmockServiceState,
} from "../interfaces";

// These are specific to OAS and not part of json schema standard
const ajv = new Ajv({ unknownFormats: ["int32", "int64"] });

const debugLog = debug("unmock:state:transformers");

const genBuilder = (
  fn: () => Record<string, Schema>,
): { spreadState: Record<string, Schema>; error?: string } => {
  try {
    return { spreadState: fn() };
  } catch (err) {
    return { spreadState: {}, error: err.message };
  }
};

export const objResponse = (
  state?: UnmockServiceState,
): IStateInputGenerator => ({
  isEmpty: state === undefined || Object.keys(state).length === 0,
  top: getTopLevelDSL(state || {}),
  gen: (schema: Schema) =>
    genBuilder(() =>
      spreadStateFromService(schema, filterTopLevelDSL(state || {})),
    ),
});

export const functionResponse = (
  responseFunction: (sreq: ISerializedRequest, scm?: Schema) => any,
  dsl?: ITopLevelDSL,
): IStateInputGenerator => ({
  isEmpty: responseFunction === undefined,
  top: getTopLevelDSL((dsl || {}) as UnmockServiceState),
  gen: (schema: Schema) =>
    genBuilder(
      () =>
        ({
          "x-unmock-function": (req: ISerializedRequest) =>
            responseFunction(req, schema),
        } as any),
    ),
});

export const textResponse = (
  state?: string,
  dsl?: ITopLevelDSL,
): IStateInputGenerator => ({
  isEmpty: typeof state !== "string" || state.length === 0,
  top: getTopLevelDSL((dsl || {}) as UnmockServiceState),
  gen: (schema: Schema) =>
    genBuilder(() => generateTextResponse(schema, state)),
});

const generateTextResponse = (
  schema: Schema,
  state: string | undefined,
): Record<string, any> => {
  debugLog(
    `generateTextResponse: Verifying ${schema} can contain a simple string`,
  );
  if (state === undefined || schema === undefined || schema.type !== "string") {
    return { "text/plain": null }; // null is used to indicate failure
  }
  return { ...schema, const: state };
};

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
const spreadStateFromService = (
  serviceSchema: any,
  statePath: any,
): { [pathKey: string]: any | null } => {
  debugLog(
    `spreadStateFromService: Looking to match ${statePath} in ${serviceSchema}`,
  );
  let matches: { [key: string]: any } = {};

  for (const key of Object.keys(statePath)) {
    debugLog(
      `spreadStateFromService: traversing the given state, looking to match ${key}`,
    );
    const scm = serviceSchema[key];
    const stateValue = statePath[key];

    if (scm === undefined) {
      if (hasNestedItems(serviceSchema)) {
        debugLog(
          `spreadStateFromService: No ${key} in schema, traversing nested items instead`,
        );
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
        debugLog(
          `spreadStateFromService: Found ${key} in schema, validating ${stateValue} against ${JSON.stringify(
            scm,
          )}, using null if types mismatch`,
        );
        // Option 2: Current scheme has matching key, and the state specifies a non-object (or schema). Validate schema.
        // TODO do we want to throw for invalid types?
        const spread = {
          [key]:
            isSchema(scm) && ajv.validate(scm, stateValue)
              ? { ...scm, const: stateValue }
              : typeof stateValue === "function"
              ? { ...scm, "x-unmock-function": stateValue }
              : null,
        };
        matches = { ...matches, ...spread };
      } else if (hasNestedItems(scm) || isNonEmptyObject(scm)) {
        debugLog(
          `spreadStateFromService: Found ${key} in schema, traversing ${JSON.stringify(
            scm,
          )} and ${JSON.stringify(stateValue)}`,
        );
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
        debugLog(
          `spreadStateFromService: Found ${key} in schema, but more ` +
            `traversal is needed and not possible -> missing value found`,
        );
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
  debugLog(
    `spreadStateFromService: Results for this iteration: ${JSON.stringify(
      matches,
    )}`,
  );
  return matches;
};

// Items that hold nested contents in OAS
const NESTED_SCHEMA_ITEMS = ["properties", "items", "additionalProperties"];

const hasNestedItems = (obj: any) =>
  NESTED_SCHEMA_ITEMS.some((key: string) => obj[key] !== undefined);

const isConcreteValue = (obj: any) =>
  ["string", "number", "boolean", "function"].includes(typeof obj);

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
