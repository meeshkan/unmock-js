import * as io from "io-ts";
import { cnst_, extendT, tuple_, type_ } from "json-schema-poet";
import {
  JSONArray,
  JSONObject,
  JSONPrimitive,
  JSONSchemaObject,
  JSSTAllOf,
  JSSTAnyOf,
  JSSTAnything,
  JSSTEmpty,
  JSSTList,
  JSSTNot,
  JSSTObject,
  JSSTOneOf,
  JSSTTuple,
} from "json-schema-strictly-typed";
import NodeBackend from "./backend";
import { CodeAsInt, HTTPMethod } from "./interfaces";
import { Schema } from "./service/interfaces";
import { ServiceStore } from "./service/serviceStore";

/*************************************************
 * (Extended, Dynamic) JSON Schema defined below *
 *************************************************
 */
// Used to differentiate between e.g. `{ foo: { type: "string" } }` as a literal value
// (i.e. key `foo` having the value of `{type: "string"}`) and a dynamic JSON schema
const DynamicJSONSymbol: unique symbol = Symbol();
interface IDynamicJSONValue {
  dynamic: typeof DynamicJSONSymbol;
}
const isDynamic = (unk: unknown): unk is IDynamicJSONValue =>
  typeof unk === "object" && (unk as any).dynamic === DynamicJSONSymbol;
const DynamicJSONValue: io.Type<
  IDynamicJSONValue,
  IDynamicJSONValue
> = new io.Type<IDynamicJSONValue, IDynamicJSONValue>(
  "DynamicJSONValueType",
  isDynamic,
  (input, context) =>
    isDynamic(input) ? io.success(input) : io.failure(input, context),
  io.identity,
);

const RecursiveUnion: io.Type<
  RecursiveUnionType,
  RecursiveUnionType
> = io.recursion("JSO", () =>
  io.union([
    JSONPrimitive,
    JSONObject,
    JSONArray,
    ExtendedArray,
    ExtendedObject,
  ]),
);
const JSO: io.Type<ExtendedJSONSchema, ExtendedJSONSchema> = io.recursion(
  "JSO",
  () => JSONSchemaObject(RecursiveUnion, DynamicJSONValue),
);

type RecursiveUnionType =
  | JSONPrimitive
  | JSONObject
  | JSONArray
  | IExtendedArrayType
  | IExtendedObjectType;

// Define json schema types extended with the dynamic json value property
type ExtendedJSONSchema = JSONSchemaObject<
  RecursiveUnionType,
  IDynamicJSONValue
>;
type ExtendedPrimitiveType = JSONPrimitive | ExtendedJSONSchema;
type ExtendedValueType =
  | ExtendedPrimitiveType
  | IExtendedArrayType
  | IExtendedObjectType
  | JSONArray
  | JSONObject;
interface IExtendedObjectType extends Record<string, ExtendedValueType> {} // Defined as interface due to circular reasons
interface IExtendedArrayType extends Array<ExtendedValueType> {} // Defined as interface due to circular reference
type EJSEmpty = JSSTEmpty<{}>; // Used as a shortcut

// Define matching codecs for the above types
const ExtendedPrimitive = io.union([JSONPrimitive, JSO]);
const ExtendedValue: io.Type<
  ExtendedValueType,
  ExtendedValueType
> = io.recursion("ExtendedValue", () =>
  io.union([
    ExtendedPrimitive,
    JSONArray,
    JSONObject,
    ExtendedObject,
    ExtendedArray,
  ]),
);
const ExtendedObject: io.Type<
  IExtendedObjectType,
  IExtendedObjectType
> = io.recursion("ExtendedObject", () => io.record(io.string, ExtendedValue));
const ExtendedArray: io.Type<
  IExtendedArrayType,
  IExtendedArrayType
> = io.recursion("ExtendedArray", () => io.array(ExtendedValue));

const spreadAndSchemify = (
  e?: IExtendedObjectType,
  f: (e: ExtendedValueType) => JSSTAnything<EJSEmpty, {}> = JSONSchemify,
) =>
  e ? Object.entries(e).reduce((a, b) => ({ ...a, [b[0]]: f(b[1]) }), {}) : {};

// hack until we get around to doing full typing :-(
const removeDynamicSymbol = (schema: any): JSONSchemaObject<EJSEmpty, {}> => {
  if (schema instanceof Array) {
    return (schema as unknown) as JSONSchemaObject<EJSEmpty, {}>;
  }
  if (typeof schema === "object") {
    const { dynamic, ...rest } = schema;
    return spreadAndSchemify(
      dynamic === DynamicJSONSymbol ? rest : schema,
      removeDynamicSymbol,
    ) as JSONSchemaObject<EJSEmpty, {}>;
  }
  return schema;
};

const JSONSchemify = (e: ExtendedValueType): JSSTAnything<EJSEmpty, {}> =>
  isDynamic(e)
    ? removeDynamicSymbol(
        // we cover all of the nested cases,
        // followed by un-nested cases
        JSSTAllOf(RecursiveUnion, DynamicJSONValue).is(e)
          ? { ...e, allOf: e.allOf.map(JSONSchemify) }
          : JSSTAnyOf(RecursiveUnion, DynamicJSONValue).is(e)
          ? { ...e, anyOf: e.anyOf.map(JSONSchemify) }
          : JSSTOneOf(RecursiveUnion, DynamicJSONValue).is(e)
          ? { ...e, oneOf: e.oneOf.map(JSONSchemify) }
          : JSSTNot(RecursiveUnion, DynamicJSONValue).is(e)
          ? { ...e, not: JSONSchemify(e.not) }
          : JSSTList(RecursiveUnion, DynamicJSONValue).is(e)
          ? { ...e, items: JSONSchemify(e.items) }
          : JSSTTuple(RecursiveUnion, DynamicJSONValue).is(e)
          ? { ...e, oneOf: e.items.map(JSONSchemify) }
          : JSSTObject(RecursiveUnion, DynamicJSONValue).is(e)
          ? {
              ...e,
              ...(e.additionalProperties
                ? { additionalProperties: JSONSchemify(e.additionalProperties) }
                : {}),
              ...spreadAndSchemify(e.patternProperties),
              ...spreadAndSchemify(e.properties),
            }
          : e,
      )
    : ExtendedArray.is(e) || JSONArray.is(e)
    ? tuple_<EJSEmpty, {}>({})(e.map(JSONSchemify))
    : ExtendedObject.is(e) || JSONObject.is(e)
    ? type_<EJSEmpty, {}>({})(spreadAndSchemify(e), {})
    : cnst_<{}>({})(e);

// Define poet to recognize the new "dynamic type"
const jspt = extendT<ExtendedJSONSchema, IDynamicJSONValue>({
  dynamic: DynamicJSONSymbol,
});

export const u = jspt;

/*******************************
 * Nock-like API defined below *
 *******************************
 */
// Defined nock-like syntax to create/update a service on the fly
type UpdateCallback = ({
  statusCode,
  data,
}: {
  statusCode: CodeAsInt | "default";
  data: Schema;
}) => ServiceStore;

// Placeholder for poet input type, to have
// e.g. standard object => { type: "object", properties: { ... }}, number => { type: "number", const: ... }
type Primitives = string | number | boolean;
type InputToPoet = { [k: string]: any } | Primitives | Primitives[];

// How the fluent dynamic service API looks like (e.g. specifies `get(endpoint: string) => DynamicServiceSpec`)
type FluentDynamicService = {
  [k in HTTPMethod]: (endpoint: string) => DynamicServiceSpec;
};

// How the actual dynamic service spec looks like (e.g. `reply(statusCode: number, data: InputToPoet): ...`)
//                                                      `replyWithFile(....)`
interface IDynamicServiceSpec {
  /**
   * Sets the reply schema for the previous base URL, endpoint and HTTP method.
   * @param statusCode
   * @param data
   */
  reply(
    statusCode: CodeAsInt | "default",
    data?: InputToPoet | InputToPoet[],
  ): FluentDynamicService & IDynamicServiceSpec;
  reply(
    data: InputToPoet | InputToPoet[],
  ): FluentDynamicService & IDynamicServiceSpec;
}

export class DynamicServiceSpec implements IDynamicServiceSpec {
  private data: Schema = {};

  // Default status code passed in constructor
  constructor(
    private updater: UpdateCallback,
    private statusCode: CodeAsInt | "default" = 200,
    private baseUrl: string,
    private name?: string,
  ) {}

  public reply(
    maybeStatusCode: CodeAsInt | "default" | InputToPoet | InputToPoet[],
    maybeData?: InputToPoet | InputToPoet[],
  ): FluentDynamicService & IDynamicServiceSpec {
    if (maybeData !== undefined) {
      this.data = JSONSchemify(maybeData) as Schema;
      this.statusCode = maybeStatusCode as CodeAsInt | "default";
    } else if (
      (typeof maybeStatusCode === "number" &&
        maybeStatusCode >= 100 &&
        maybeStatusCode <= 599) ||
      maybeStatusCode === "default"
    ) {
      // we assume it's a status code
      this.statusCode = maybeStatusCode as CodeAsInt | "default";
    } else {
      this.data = JSONSchemify(maybeStatusCode) as Schema;
    }
    const store = this.updater({
      data: this.data,
      statusCode: this.statusCode,
    });

    const methods = buildFluentNock(store, this.baseUrl, this.name);
    const dss = new DynamicServiceSpec(
      this.updater,
      this.statusCode,
      this.baseUrl,
      this.name,
    );
    // Have to manually update the methods to match `IDynamicServiceSpec`
    return { ...methods, reply: dss.reply };
  }
}

const buildFluentNock = (
  store: ServiceStore,
  baseUrl: string,
  name?: string,
): FluentDynamicService => {
  const dynFn = (method: HTTPMethod, endpoint: string) => ({
    statusCode,
    data,
  }: {
    statusCode: CodeAsInt | "default";
    data: Schema;
  }) =>
    store.updateOrAdd({
      baseUrl,
      method,
      endpoint: endpoint.startsWith("/") ? endpoint : `/${endpoint}`,
      statusCode,
      response: data,
      name,
    });
  return Object.entries({
    get: 200,
    head: 200,
    post: 201,
    put: 204,
    patch: 204,
    delete: 200,
    options: 200,
    trace: 200,
  }).reduce(
    (o, [method, code]) => ({
      ...o,
      [method]: (endpoint: string) =>
        new DynamicServiceSpec(
          dynFn(method as HTTPMethod, endpoint),
          code as CodeAsInt,
          baseUrl,
          name,
        ),
    }),
    {},
  ) as FluentDynamicService;
};

export const nockify = ({
  backend,
  baseUrl,
  name,
}: {
  backend: NodeBackend;
  baseUrl: string;
  name?: string;
}) => buildFluentNock(backend.serviceStore, baseUrl, name);
