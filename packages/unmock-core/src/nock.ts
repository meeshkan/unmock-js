import * as io from "io-ts";
import { cnst_, extendT, string_, tuple_, type_ } from "json-schema-poet";
import {
  JSONArray,
  JSONObject,
  JSONPrimitive,
  JSONSchemaObject,
  JSSTAnything,
  JSSTEmpty,
} from "json-schema-strictly-typed";
import NodeBackend from "./backend";
import { HTTPMethod } from "./interfaces";
import { Service } from "./service";
import { Schema, StateType } from "./service/interfaces";
import { ServiceStore } from "./service/serviceStore";
import { ServiceSpy } from "./service/spy";

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

const JSO = JSONSchemaObject(JSSTEmpty(DynamicJSONValue), DynamicJSONValue);
// Define json schema types extended with the dynamic json value property
type ExtendedJSONSchema = JSONSchemaObject<
  JSSTEmpty<IDynamicJSONValue>,
  IDynamicJSONValue
>;
type ExtendedPrimitiveType = JSONPrimitive | ExtendedJSONSchema;
type ExtendedValueType =
  | ExtendedPrimitiveType
  | IExtendedArrayType
  | IExtendedObjectType
  | JSONArray
  | JSONObject;
interface IExtendedObjectType {
  [k: string]: ExtendedValueType;
}
interface IExtendedArrayType extends Array<ExtendedValueType> {} // Defined as interface due to circular reference

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

const removeDynamicSymbol = (
  schema: ExtendedJSONSchema,
): JSONSchemaObject<JSSTEmpty<{}>, {}> => {
  const { dynamic, ...rest } = schema;
  return rest;
};

const JSONSchemify = (e: ExtendedValueType): JSSTAnything<JSSTEmpty<{}>, {}> =>
  JSO.is(e)
    ? removeDynamicSymbol(e)
    : ExtendedArray.is(e) || JSONArray.is(e)
    ? tuple_<JSSTEmpty<{}>, {}>({})(
        e.map((i: ExtendedValueType) => JSONSchemify(i)),
      )
    : ExtendedObject.is(e) || JSONObject.is(e)
    ? type_<JSSTEmpty<{}>, {}>({})(
        Object.entries(e).reduce(
          (a, b) => ({ ...a, [b[0]]: JSONSchemify(b[1]) }),
          {},
        ),
        {},
      )
    : cnst_<{}>({})(e);

// Define poet to recognize the new "dynamic type"
const jspt = extendT<JSSTEmpty<IDynamicJSONValue>, IDynamicJSONValue>({
  dynamic: DynamicJSONSymbol,
});

// TODO add more built-in types like this
export const u = {
  str() {
    return jspt.string();
  },
  number() {
    return jspt.number();
  },
  int() {
    return jspt.integer();
  },
  city() {
    return string_<IDynamicJSONValue>({ dynamic: DynamicJSONSymbol })(
      "address.city",
    );
  },
};

// Defined nock-like syntax to create/update a service on the fly
type UpdateCallback = ({
  statusCode,
  data,
}: {
  statusCode: number;
  data: Schema;
}) => { store: ServiceStore; service: Service };

// Placeholder for poet input type, to have
// e.g. standard object => { type: "object", properties: { ... }}, number => { type: "number", const: ... }
type Primitives = string | number | boolean;
type InputToPoet = { [k: string]: any } | Primitives | Primitives[];

export class DynamicServiceSpec {
  private data: Schema = {};

  // Default status code passed in constructor
  constructor(
    private updater: UpdateCallback,
    private statusCode: number = 200,
    private baseUrl: string,
    private name?: string,
  ) {}

  // TODO: Should this allow fluency for consecutive .get, .post, etc on the same service?
  public reply(
    statusCode: number,
    data?: InputToPoet | InputToPoet[],
  ): FluentDynamicService;
  public reply(data: InputToPoet | InputToPoet[]): FluentDynamicService;
  public reply(
    maybeStatusCode: number | InputToPoet | InputToPoet[],
    maybeData?: InputToPoet | InputToPoet[],
  ): FluentDynamicService {
    if (maybeData !== undefined) {
      this.data = JSONSchemify(maybeData) as Schema;
      this.statusCode = maybeStatusCode as number;
    } else if (
      typeof maybeStatusCode === "number" &&
      maybeStatusCode >= 100 &&
      maybeStatusCode < 599
    ) {
      // we assume it's a status code
      this.statusCode = maybeStatusCode;
    } else {
      this.data = JSONSchemify(maybeStatusCode) as Schema;
    }
    const { store, service } = this.updater({
      data: this.data,
      statusCode: this.statusCode,
    });

    return buildFluentNock(store, this.baseUrl, this.name, service);
  }
}

type FluentDynamicService = {
  [k in HTTPMethod]: (endpoint: string) => DynamicServiceSpec;
} & { state: StateType; spy: ServiceSpy };

const buildFluentNock = (
  store: ServiceStore,
  baseUrl: string,
  name?: string,
  service?: Service,
): FluentDynamicService => {
  const dynFn = (method: HTTPMethod, endpoint: string) => ({
    statusCode,
    data,
  }: {
    statusCode: number;
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
  const fluent = Object.entries({
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
          code,
          baseUrl,
          name,
        ),
    }),
    {},
  ) as FluentDynamicService;
  if (service !== undefined) {
    fluent.state = service.state;
    fluent.spy = service.spy;
  }
  return fluent;
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
