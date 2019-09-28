import { array } from "fp-ts/lib/Array";
import { none, Option, some } from "fp-ts/lib/Option";
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
import { fromTraversable, Iso, Prism } from "monocle-ts";
import { valAsConst } from "openapi-refinements";
import * as querystring from "query-string";
import NodeBackend from "./backend";
import { identityGetter } from "./generator";
import { CodeAsInt, HTTPMethod } from "./interfaces";
import { Schema, ValidEndpointType } from "./service/interfaces";
import { ServiceStore } from "./service/serviceStore";

/*************************************************
 * (Extended, Dynamic) JSON Schema defined below *
 *************************************************
 */
// Used to differentiate between e.g. `{ foo: { type: "string" } }` as a literal value
// (i.e. key `foo` having the value of `{type: "string"}`) and a dynamic JSON schema
const DynamicJSONSymbol: unique symbol = Symbol();
export interface IDynamicJSONValue {
  dynamic: typeof DynamicJSONSymbol;
}
const isDynamic = (unk: unknown): unk is IDynamicJSONValue =>
  typeof unk === "object" &&
  unk !== null &&
  (unk as any).dynamic === DynamicJSONSymbol;
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

/*************************************************
 * (Extended, Maybe) JSON Schema defined below *
 *************************************************
 */
// Used to signal that a value is optional in an object
const MaybeJSONSymbol: unique symbol = Symbol();
export interface IMaybeJSONValue {
  maybe: typeof MaybeJSONSymbol;
  val: ExtendedValueType;
}
const isMaybe = (unk: unknown): unk is IMaybeJSONValue =>
  typeof unk === "object" &&
  unk !== null &&
  (unk as any).maybe === MaybeJSONSymbol &&
  ExtendedValue.is((unk as any).val);

const MaybeJSONValue: io.Type<IMaybeJSONValue, IMaybeJSONValue> = new io.Type<
  IMaybeJSONValue,
  IMaybeJSONValue
>(
  "MaybeJSONValueType",
  isMaybe,
  (input, context) =>
    isMaybe(input) ? io.success(input) : io.failure(input, context),
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

export type RecursiveUnionType =
  | JSONPrimitive
  | JSONObject
  | JSONArray
  | IExtendedArrayType
  | IExtendedObjectType;

// Define json schema types extended with the dynamic json value property
export type ExtendedJSONSchema = JSONSchemaObject<
  RecursiveUnionType,
  IDynamicJSONValue
>;
export type ExtendedPrimitiveType = JSONPrimitive | ExtendedJSONSchema | RegExp;
export type ExtendedValueType =
  | ExtendedPrimitiveType
  | IExtendedArrayType
  | IExtendedObjectType
  | JSONArray
  | JSONObject;

export interface ITameExtendedObjectType
  extends Record<string, ExtendedValueType> {} // Defined as interface due to circular reasons

export interface IExtendedObjectType
  extends Record<string, ExtendedValueType | IMaybeJSONValue> {} // Defined as interface due to circular reasons

const rejectOptionals = (i: IExtendedObjectType): ITameExtendedObjectType =>
  new Iso<
    IExtendedObjectType,
    Array<[string, ExtendedValueType | IMaybeJSONValue]>
  >(
    a => Object.entries(a),
    q => q.reduce((a, b) => ({ ...a, [b[0]]: b[1] }), {}),
  )
    .composeTraversal(fromTraversable(array)())
    .composePrism(
      new Prism<
        [string, ExtendedValueType | IMaybeJSONValue],
        [string, ExtendedValueType]
      >(
        a =>
          ((
            q: string,
            r: ExtendedValueType | IMaybeJSONValue,
          ): Option<[string, ExtendedValueType]> =>
            MaybeJSONValue.is(r) ? none : some([q, r]))(a[0], a[1]),
        a => a,
      ),
    )
    .composeGetter(identityGetter())
    .getAll(i)
    .reduce((a, b) => ({ ...a, [b[0]]: b[1] }), {});

const keepOptionals = (i: IExtendedObjectType): ITameExtendedObjectType =>
  new Iso<
    IExtendedObjectType,
    Array<[string, ExtendedValueType | IMaybeJSONValue]>
  >(
    a => Object.entries(a),
    q => q.reduce((a, b) => ({ ...a, [b[0]]: b[1] }), {}),
  )
    .composeTraversal(fromTraversable(array)())
    .composePrism(
      new Prism<
        [string, ExtendedValueType | IMaybeJSONValue],
        [string, ExtendedValueType]
      >(a => (MaybeJSONValue.is(a[1]) ? some([a[0], a[1].val]) : none), a => a),
    )
    .composeGetter(identityGetter())
    .getAll(i)
    .reduce((a, b) => ({ ...a, [b[0]]: b[1] }), {});

export interface IExtendedArrayType extends Array<ExtendedValueType> {} // Defined as interface due to circular reference
type EJSEmpty = JSSTEmpty<{}>; // Used as a shortcut

const IORegExp = new io.Type<RegExp, RegExp>(
  "IORegExp",
  (unk: unknown): unk is RegExp => unk instanceof RegExp,
  (input, context) =>
    input instanceof RegExp ? io.success(input) : io.failure(input, context),
  io.identity,
);

// Define matching codecs for the above types
const ExtendedPrimitive = io.union([JSONPrimitive, JSO, IORegExp]);
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
> = io.recursion("ExtendedObject", () =>
  io.record(io.string, io.union([ExtendedValue, MaybeJSONValue])),
);
const ExtendedArray: io.Type<
  IExtendedArrayType,
  IExtendedArrayType
> = io.recursion("ExtendedArray", () => io.array(ExtendedValue));

const spreadAndSchemify = <T, C extends object>(
  e: ITameExtendedObjectType | undefined,
  f: (e: ExtendedValueType) => JSSTAnything<T, C>,
) =>
  e ? Object.entries(e).reduce((a, b) => ({ ...a, [b[0]]: f(b[1]) }), {}) : {};

// hack until we get around to doing full typing :-(
const removeDynamicSymbol = (schema: any): JSONSchemaObject<EJSEmpty, {}> => {
  const { dynamic, ...rest } = schema;
  return rest;
};

const fuzzNoop = (
  schema: any,
): JSONSchemaObject<RecursiveUnionType, IDynamicJSONValue> =>
  (schema as unknown) as JSONSchemaObject<
    RecursiveUnionType,
    IDynamicJSONValue
  >;

type CType = string | number | boolean | null;

type ConstTransformer<T, C extends object> = (e: CType) => JSSTAnything<T, C>;

// total hack comes from the conversion from schema to json-schema
// this works because valAsConst only ever yields valid JSON schema
// we should mitigate this by makeing a "subset" type
// common to both OAS & JSON Schema
const simpleConstantTransformer: ConstTransformer<EJSEmpty, {}> = (
  e: CType,
): JSSTAnything<EJSEmpty, {}> =>
  valAsConst(cnst_<{}>({})(e).const) as JSSTAnything<EJSEmpty, {}>;

const fuzz: ConstTransformer<RecursiveUnionType, IDynamicJSONValue> = (
  e: CType,
): JSSTAnything<RecursiveUnionType, IDynamicJSONValue> =>
  typeof e === "string"
    ? jspt.string()
    : typeof e === "number" && Math.floor(e) === e
    ? jspt.integer()
    : typeof e === "number"
    ? jspt.number()
    : typeof e === "boolean"
    ? jspt.boolean()
    : jspt.nul();

const unfuzz: ConstTransformer<RecursiveUnionType, IDynamicJSONValue> = (
  e: CType,
): JSSTAnything<RecursiveUnionType, IDynamicJSONValue> =>
  typeof e === "string"
    ? jspt.cnst(e)
    : typeof e === "number"
    ? jspt.cnst(e)
    : typeof e === "boolean"
    ? jspt.cnst(e)
    : jspt.cnst(null);

export const JSONSchemify = <T, C extends object>(c: C) => (
  schemaToSchemaTransformer: (schema: any) => JSSTAnything<T, C>,
) => (constantHandler: ConstTransformer<T, C>) => (
  e: ExtendedValueType,
): JSSTAnything<T, C> =>
  isDynamic(e)
    ? schemaToSchemaTransformer(
        // we cover all of the nested cases,
        // followed by un-nested cases
        JSSTAllOf(RecursiveUnion, DynamicJSONValue).is(e)
          ? {
              ...e,
              allOf: e.allOf.map(
                JSONSchemify<T, C>(c)(schemaToSchemaTransformer)(
                  constantHandler,
                ),
              ),
            }
          : JSSTAnyOf(RecursiveUnion, DynamicJSONValue).is(e)
          ? {
              ...e,
              anyOf: e.anyOf.map(
                JSONSchemify<T, C>(c)(schemaToSchemaTransformer)(
                  constantHandler,
                ),
              ),
            }
          : JSSTOneOf(RecursiveUnion, DynamicJSONValue).is(e)
          ? {
              ...e,
              oneOf: e.oneOf.map(
                JSONSchemify<T, C>(c)(schemaToSchemaTransformer)(
                  constantHandler,
                ),
              ),
            }
          : JSSTNot(RecursiveUnion, DynamicJSONValue).is(e)
          ? {
              ...e,
              not: JSONSchemify<T, C>(c)(schemaToSchemaTransformer)(
                constantHandler,
              )(e.not),
            }
          : JSSTList(RecursiveUnion, DynamicJSONValue).is(e)
          ? {
              ...e,
              items: JSONSchemify<T, C>(c)(schemaToSchemaTransformer)(
                constantHandler,
              )(e.items),
            }
          : JSSTTuple(RecursiveUnion, DynamicJSONValue).is(e)
          ? {
              ...e,
              oneOf: e.items.map(
                JSONSchemify<T, C>(c)(schemaToSchemaTransformer)(
                  constantHandler,
                ),
              ),
            }
          : JSSTObject(RecursiveUnion, DynamicJSONValue).is(e)
          ? {
              ...e,
              ...(e.additionalProperties
                ? {
                    additionalProperties: JSONSchemify<T, C>(c)(
                      schemaToSchemaTransformer,
                    )(constantHandler)(e.additionalProperties),
                  }
                : {}),
              ...(e.patternProperties
                ? {
                    patternProperties: spreadAndSchemify(
                      e.patternProperties,
                      JSONSchemify<T, C>(c)(schemaToSchemaTransformer)(
                        constantHandler,
                      ),
                    ),
                  }
                : {}),
              ...(e.properties
                ? {
                    properties: spreadAndSchemify(
                      e.properties,
                      JSONSchemify<T, C>(c)(schemaToSchemaTransformer)(
                        constantHandler,
                      ),
                    ),
                  }
                : {}),
            }
          : e,
      )
    : ExtendedArray.is(e) || JSONArray.is(e)
    ? tuple_<T, C>(c)(
        e.map(
          JSONSchemify<T, C>(c)(schemaToSchemaTransformer)(constantHandler),
        ),
      )
    : ExtendedObject.is(e) || JSONObject.is(e)
    ? type_<T, C>(c)(
        spreadAndSchemify(
          rejectOptionals(e),
          JSONSchemify<T, C>(c)(schemaToSchemaTransformer)(constantHandler),
        ),
        spreadAndSchemify(
          keepOptionals(e),
          JSONSchemify<T, C>(c)(schemaToSchemaTransformer)(constantHandler),
        ),
      )
    : e instanceof RegExp
    ? { type: "string", pattern: e.source, ...c }
    : constantHandler(e as CType);

// Define poet to recognize the new "dynamic type"
const jspt = extendT<RecursiveUnionType, IDynamicJSONValue>({
  dynamic: DynamicJSONSymbol,
});

export const u = {
  ...jspt,
  fuzz: JSONSchemify<RecursiveUnionType, IDynamicJSONValue>({
    dynamic: DynamicJSONSymbol,
  })(fuzzNoop)(fuzz),
  unfuzz: JSONSchemify<RecursiveUnionType, IDynamicJSONValue>({
    dynamic: DynamicJSONSymbol,
  })(fuzzNoop)(unfuzz),
  opt: (e: ExtendedJSONSchema): IMaybeJSONValue => ({
    maybe: MaybeJSONSymbol,
    val: e,
  }),
};

/*******************************
 * Nock-like API defined below *
 *******************************
 */
// Defined nock-like syntax to create/update a service on the fly
type UpdateCallback = (
  store: ServiceStore,
) => (
  queriesFromCallToQueries: Record<string, Schema>,
) => ({
  statusCode,
  data,
  headers,
}: {
  statusCode: CodeAsInt | "default";
  headers: Record<string, Schema>;
  data: Schema;
}) => ServiceStore;

// Placeholder for poet input type, to have
// e.g. standard object => { type: "object", properties: { ... }}, number => { type: "number", const: ... }
type Primitives = string | number | boolean;
type InputToPoet = { [k: string]: any } | Primitives | Primitives[];

// How the fluent dynamic service API looks like (e.g. specifies `get(endpoint: string) => DynamicServiceSpec`)
export interface IFluentDynamicService {
  tldr(): void;
  get(endpoint: ValidEndpointType): DynamicServiceSpec;
  head(endpoint: ValidEndpointType): DynamicServiceSpec;
  post(endpoint: ValidEndpointType): DynamicServiceSpec;
  put(endpoint: ValidEndpointType): DynamicServiceSpec;
  patch(endpoint: ValidEndpointType): DynamicServiceSpec;
  delete(endpoint: ValidEndpointType): DynamicServiceSpec;
  options(endpoint: ValidEndpointType): DynamicServiceSpec;
  trace(endpoint: ValidEndpointType): DynamicServiceSpec;
}

// How the actual dynamic service spec looks like (e.g. `reply(statusCode: number, data: InputToPoet): ...`)
//                                                      `replyWithFile(....)`
interface IDynamicServiceSpec {
  /**
   * Sets the reply schema for the previous base URL, endpoint and HTTP method.
   * @param statusCode
   * @param data
   */
  query(
    data?: Record<string, InputToPoet>,
  ): IFluentDynamicService & IDynamicServiceSpec;
  reply(
    statusCode: CodeAsInt | "default",
    data?: InputToPoet | InputToPoet[],
    headers?: InputToPoet,
  ): IFluentDynamicService & IDynamicServiceSpec;
  reply(
    data: InputToPoet | InputToPoet[],
  ): IFluentDynamicService & IDynamicServiceSpec;
}

export const vanillaJSONSchemify = JSONSchemify<EJSEmpty, {}>({})(
  removeDynamicSymbol,
)(simpleConstantTransformer);

export class DynamicServiceSpec implements IDynamicServiceSpec {
  private data: Schema = {};
  private headers: Record<string, Schema> = {};
  private queriesFromCallToQueries: Record<string, Schema> = {};

  // Default status code passed in constructor
  constructor(
    private updater: UpdateCallback,
    private statusCode: CodeAsInt | "default" = 200,
    private baseUrl: string,
    private accumulatedQueries: Record<string, Schema>,
    private requestHeaders: Record<string, JSSTAnything<JSSTEmpty<{}>, {}>>,
    private serviceStore: ServiceStore,
    private name?: string,
  ) {}

  public query(
    data?: Record<string, InputToPoet>,
  ): IFluentDynamicService & IDynamicServiceSpec {
    this.queriesFromCallToQueries = {
      ...this.queriesFromCallToQueries,
      ...this.accumulatedQueries,
      ...(data
        ? Object.entries(data).reduce(
            (a, b) => ({
              ...a,
              [b[0]]: vanillaJSONSchemify(b[1]),
            }),
            {},
          )
        : {}),
    } as Record<string, Schema>;

    const methods = buildFluentNock(
      this.serviceStore,
      this.baseUrl,
      this.requestHeaders,
      this.name,
    );
    const dss = new DynamicServiceSpec(
      this.updater,
      this.statusCode,
      this.baseUrl,
      this.queriesFromCallToQueries,
      this.requestHeaders,
      this.serviceStore,
      this.name,
    );

    return {
      ...methods,
      query: dss.query.bind(dss),
      reply: dss.reply.bind(dss),
    };
  }

  public reply(
    maybeStatusCode: CodeAsInt | "default" | InputToPoet | InputToPoet[],
    maybeData?: InputToPoet | InputToPoet[],
    maybeHeaders?: Record<string, InputToPoet>,
  ): IFluentDynamicService & IDynamicServiceSpec {
    if (maybeData !== undefined) {
      this.data = vanillaJSONSchemify(maybeData) as Schema; // TODO should this be some JSSTX?
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
      this.data = vanillaJSONSchemify(maybeStatusCode) as Schema;
    }
    this.headers = maybeHeaders
      ? (Object.entries(maybeHeaders).reduce(
          (a, b) => ({
            ...a,
            [b[0]]: vanillaJSONSchemify(b[1]),
          }),
          {},
        ) as Record<string, Schema>)
      : {};
    const store = this.updater(this.serviceStore)({
      ...this.queriesFromCallToQueries,
      ...this.accumulatedQueries,
    })({
      data: this.data,
      headers: this.headers,
      statusCode: this.statusCode,
    });

    const methods = buildFluentNock(
      store,
      this.baseUrl,
      this.requestHeaders,
      this.name,
    );
    const dss = new DynamicServiceSpec(
      this.updater,
      this.statusCode,
      this.baseUrl,
      { ...this.queriesFromCallToQueries, ...this.accumulatedQueries },
      this.requestHeaders,
      store,
      this.name,
    );
    // Have to manually update the methods to match `IDynamicServiceSpec`
    return {
      ...methods,
      query: dss.query.bind(dss),
      reply: dss.reply.bind(dss),
    };
  }
}

const updateStore = (
  baseUrl: string,
  method: HTTPMethod,
  endpoint: ValidEndpointType,
  query: Record<string, Schema>,
  requestHeaders: Record<string, Schema>,
  body?: Schema,
  name?: string,
) => (store: ServiceStore) => (
  queriesFromCallToQueries: Record<string, Schema>,
) => ({
  statusCode,
  headers,
  data,
}: {
  statusCode: CodeAsInt | "default";
  headers: Record<string, Schema>;
  data: Schema;
}) =>
  store.updateOrAdd({
    baseUrl,
    method,
    endpoint,
    query: { ...query, ...queriesFromCallToQueries },
    requestHeaders,
    responseHeaders: headers,
    body,
    statusCode,
    response: data,
    name,
  });

const endpointToQs = (endpoint: ValidEndpointType) =>
  Object.entries(
    querystring.parse(
      typeof endpoint === "string" ? endpoint.split("?")[1] || "" : "",
    ),
  ).reduce(
    (a, b) => ({
      ...a,
      [b[0]]: vanillaJSONSchemify(b[1] === undefined ? null : b[1]),
    }),
    {},
  ) || {};

const naked = (endpoint: ValidEndpointType) =>
  typeof endpoint === "string" ? endpoint.split("?")[0] : endpoint;

const HTTPMethodsWithCommonStatusResponses = {
  get: 200,
  head: 200,
  post: 201,
  put: 204,
  patch: 204,
  delete: 200,
  options: 200,
  trace: 200,
};

const buildFluentNock = (
  store: ServiceStore,
  baseUrl: string,
  requestHeaders: Record<string, JSSTAnything<EJSEmpty, {}>>,
  name?: string,
): IFluentDynamicService =>
  ((fds: IFluentDynamicService) => ({
    ...fds,
    tldr: () =>
      [
        "/",
        "/{a}",
        "/{a}/{b}",
        "/{a}/{b}/{c}",
        "/{a}/{b}/{c}/{d}",
        "/{a}/{b}/{c}/{d}/{e}",
        "/{a}/{b}/{c}/{d}/{e}/{f}",
        "/{a}/{b}/{c}/{d}/{e}/{f}/{g}",
        "/{a}/{b}/{c}/{d}/{e}/{f}/{g}/{h}",
      ].forEach(p =>
        Object.entries(
          HTTPMethodsWithCommonStatusResponses,
          // "cast" fds to any to leave the TS world for dynamic method calls
          // "cast" back to IDynamicServiceSpec for consistency
        ).forEach(([method, code]) =>
          ((fds as any)[method](p) as IDynamicServiceSpec).reply(code),
        ),
      ),
  }))(Object.entries(HTTPMethodsWithCommonStatusResponses).reduce(
    (o, [method, code]) => ({
      ...o,
      [method]:
        method === "post" || method === "patch" || method === "put"
          ? (endpoint: ValidEndpointType, requestBody?: ExtendedJSONSchema) =>
              new DynamicServiceSpec(
                updateStore(
                  baseUrl,
                  method as HTTPMethod,
                  naked(endpoint),
                  endpointToQs(endpoint) || {},
                  requestHeaders as Record<string, Schema>,
                  requestBody !== undefined
                    ? (vanillaJSONSchemify(requestBody) as Schema)
                    : undefined,
                  name,
                ),
                code as CodeAsInt,
                baseUrl,
                endpointToQs(endpoint) || {},
                requestHeaders,
                store,
                name,
              )
          : (endpoint: ValidEndpointType) =>
              new DynamicServiceSpec(
                updateStore(
                  baseUrl,
                  method as HTTPMethod,
                  naked(endpoint),
                  endpointToQs(endpoint) || {},
                  requestHeaders as Record<string, Schema>,
                  undefined,
                  name,
                ),
                code as CodeAsInt,
                baseUrl,
                endpointToQs(endpoint) || {},
                requestHeaders,
                store,
                name,
              ),
    }),
    {},
  ) as IFluentDynamicService);

export const nockify = ({
  backend,
  baseUrl,
  requestHeaders,
  name,
}: {
  backend: NodeBackend;
  baseUrl: string;
  requestHeaders: Record<string, JSSTAnything<EJSEmpty, {}>>;
  name?: string;
}) => buildFluentNock(backend.serviceStore, baseUrl, requestHeaders, name);
