/**
 * Implements the logic for generating a response from a service file
 */
// Try fixing broken imports in Node <= 8 by using require instead of default import
const jsf = require("json-schema-faker"); // tslint:disable-line:no-var-requires
import { array } from "fp-ts/lib/Array";
import { isNone, none, Option, some } from "fp-ts/lib/Option";
import { isParameter, isResponse, MediaType } from "loas3/dist/generated/full";
import { fromTraversable, Getter, Iso, Lens, Optional, Prism } from "monocle-ts";
import {
  allMethods,
  changeRef,
  changeRefs,
  getComponentFromRef,
  getParameterFromRef,
  getResponseFromRef,
  getSchemaFromRef,
  internalGetComponent,
  MethodNames,
  objectToArray,
  valueLens,
} from "openapi-refinements";
import {
  CreateResponse,
  IListener,
  ISerializedRequest,
  ISerializedResponse,
  IUnmockOptions,
} from "./interfaces";
import {
  Header,
  isReference,
  OpenAPIObject,
  Operation,
  Parameter,
  PathItem,
  Reference,
  Response,
  Responses,
  Schema,
} from "./service/interfaces";
import { ServiceStore } from "./service/serviceStore";

export const without = <T>(p: T, m: keyof T): T => {
  const o = { ...p };
  delete o[m];
  return o;
};

export const hasUrl = (protocol: string, host: string, o: OpenAPIObject) =>
  o.servers ? o.servers.map(m => m.url).indexOf(`${protocol}://${host}`) >= 0 : false;

const prunePathItemInternal = (m: MethodNames, a: MethodNames[], p: PathItem): PathItem =>
  a.length === 0 ? p : prunePathItemInternal(m, a.slice(1), a[0] === m ? p : without(p, a[0]));

export const prunePathItem = (m: MethodNames, p: PathItem) => prunePathItemInternal(m, allMethods, p);

export const matchesInternal = (a: string[], b: string[]): boolean =>
  a.length === b.length
  && (a.length === 0
    || (((a[0] === b[0])
      || (b[0].length > 2 && b[0][0] === "{" && b[0].slice(-1) === "}")) && matchesInternal(a.slice(1), b.slice(1))));

export const matches = (a: string, b: string): boolean => matchesInternal(a.split("/"), b.split("/"));

export const refName = (r: Reference): string => r.$ref.split("/")[3];

export const firstElementOptional = <T>() => new Optional<T[], T>(
  s => s.length > 0 ? some(s[0]) : none,
  a => s => [a, ...s.slice(1)],
);

export const keyLens = <A, T>() => new Lens<[A, T], A>(
  a => a[0],
  a => s => [a, s[1]],
);

const getFirstMethodInternal2 = (
  p: PathItem,
  n: MethodNames,
  m: MethodNames[],
  o?: Operation,
): Option<[MethodNames, Operation]> =>
  o ? some([n, o]) : getFirstMethodInternal(m, p);

const getFirstMethodInternal = (m: MethodNames[], p: PathItem): Option<[MethodNames, Operation]> =>
  m.length === 0 ? none : getFirstMethodInternal2(p, m[0], m.slice(1), p[m[0]]);

export const getFirstMethod = (p: PathItem): Option<[MethodNames, Operation]> =>
  getFirstMethodInternal(allMethods, p);

export const operationOptional = new Optional<PathItem, [MethodNames, Operation]>(
  a => getFirstMethod(a),
  a => s => ({ ...s, [a[0]]: a[1]}),
);

export const getHeaderFromRef = (o: OpenAPIObject, d: string): Option<Header> =>
  getComponentFromRef(
    o,
    d,
    a => (a.headers ? some(a.headers) : none),
    internalGetHeaderFromRef,
  );

export const internalGetHeaderFromRef = internalGetComponent(getHeaderFromRef);

export const useIfHeaderLastMile = (p: Parameter, r: Option<Schema>): Option<[string, Schema]> =>
  isNone(r) ? none : some([p.name, r.value || { type: "string" }]);

export const useIfHeader = (o: OpenAPIObject, p: Parameter): Option<[string, Schema]> =>
  p.in !== "header"
    ? none
    : useIfHeaderLastMile(
      p,
      p.schema
        ? isReference(p.schema)
          ? getSchemaFromRef(o, refName(p.schema))
          : some(p.schema)
        : some({ type: "string"}));

export const identityGetter = <T>() => new Getter<T, T>(i => i);

export const parameterSchema = (o: OpenAPIObject) => new Optional<Parameter, [string, Schema]>(
  a => useIfHeader(o, a),
  a => s => ({ ...s, name: a[0], schema: a[1] }),
);

export const matcher = (req: ISerializedRequest, r: Record<string, OpenAPIObject>): Record<string, OpenAPIObject> =>
  objectToArray<OpenAPIObject>()
  .composeTraversal(fromTraversable(array)())
  .composeLens(valueLens())
  .modify(oai => Optional.fromNullableProp<OpenAPIObject>()("paths")
    .composeIso(objectToArray<PathItem>())
    .composeTraversal(fromTraversable(array)())
    .composeLens(valueLens())
    .modify(pathItem => prunePathItem(req.method, pathItem)) (
        {
          ...oai,
          ...(oai.paths ? {
              paths: Object.entries(oai)
                .reduce((i, [n, o]) =>
                  ({ ...i, ...(matches(req.path, n) ? {[n]: o} : {})}), {}),
              } : {}),
        }))(Object.entries(r)
        .reduce((i, [n, o]) => ({ ...i, ...(hasUrl(req.protocol, req.host, o) ? {[n]: o} : {})}), {}));

const hoistTransformer = (f: (req: ISerializedRequest, r: OpenAPIObject) => OpenAPIObject) =>
    (req: ISerializedRequest, r: Record<string, OpenAPIObject>): Record<string, OpenAPIObject> =>
  objectToArray<OpenAPIObject>()
  .composeTraversal(
    fromTraversable(array)<[string, OpenAPIObject]>()
      .filter(([__, o]) =>
        hasUrl(req.protocol, req.host, o)))
  .composeLens(valueLens()).modify(oai => f(req, oai))(r);

export function responseCreatorFactory2({
  listeners = [],
  store,
}: {
  listeners?: IListener[];
  options: IUnmockOptions;
  store: ServiceStore;
}): CreateResponse {
    const transformers = [
      // first transformer is the matcher
      matcher,
      // subsequent developer-defined transformers
      ...Object.entries(store.cores).map(([_, core]) =>
        hoistTransformer(core.transformer)),
    ];
    return (req: ISerializedRequest) => {
      const schemaRecord = transformers
        .reduce((a, b) => b(req, a),
          Object.entries(store.cores)
            .reduce((a, [n, x]) => ({ ...a, [n]: x.schema}), {}));
      const toSchemas = objectToArray<OpenAPIObject>()
        .composeOptional(firstElementOptional());
      const toSchema = toSchemas
        .composeLens(valueLens());
      const schema: Option<OpenAPIObject> = toSchema
        .getOption(schemaRecord);
      const operation: Option<Operation> = toSchema
        .composeOptional(Optional.fromNullableProp<OpenAPIObject>()("paths"))
        .composeIso(objectToArray())
        .composeOptional(firstElementOptional())
        .composeLens(valueLens())
        .composeOptional(operationOptional)
        .composeLens(valueLens())
        .getOption(schemaRecord);
      if (isNone(operation) || isNone(schema)) {
        throw Error(`Cannot find a matcher for this request: ${JSON.stringify(req, null, 2)}`);
      }
      const codes: Array<(keyof Responses)> = Object.keys(operation.value.responses) as Array<keyof Responses>;
      const code = codes[Math.floor(Math.random() * codes.length)];
      const statusCode = code === "default" ? 500 : +code;
      const definitions = schema.value.components && schema.value.components.schemas
        ? Object.entries(schema.value.components.schemas)
            .reduce((a, b) => ({...a, [b[0]]: isReference(b[1]) ? changeRef(b[1]) : changeRefs(b[1])}), {})
        : {};
      const headerSchema0 = Optional.fromNullableProp<Operation>()("parameters")
        .composeTraversal(fromTraversable(array)())
        .composePrism(new Prism(
          s =>
            isParameter(s)
              ? some(s)
              : isReference(s)
              ? getParameterFromRef(schema.value, refName(s))
              : none,
          a => a,
        ))
        .composeOptional(parameterSchema(schema.value))
        .composeGetter(identityGetter())
        .getAll(operation.value);
      const path1 = Optional.fromNullableProp<Operation>()("responses")
      .composeOptional(Optional.fromNullableProp<Responses>()(code))
      .composePrism(
        new Prism(
          s =>
            isResponse(s)
              ? some(s)
              : isReference(s)
              ? getResponseFromRef(schema.value, refName(s))
              : none,
          a => a,
        ),
      );
      const stringHeader = (n: string, o: Option<Header>): Option<[string, Header]> =>
        isNone(o) ? none : some([n, o.value]);
      const headerSchema1 = path1
        .composeOptional(Optional.fromNullableProp<Response>()("headers"))
        .composeIso(objectToArray())
        .composeTraversal(fromTraversable(array)())
        .composePrism(new Prism<[string, Reference | Header], [string, Header]>(
          a => isReference(a[1])
            ? stringHeader(a[0], getHeaderFromRef(schema.value, refName(a[1])))
            : some([a[0], a[1]]),
          a => a,
        ))
        .composeIso(new Iso<[string, Header], Parameter>(
          a => ({ ...a[1], name: a[0], in: "header"}),
          a => [a.name, a],
        ))
        .composeOptional(parameterSchema(schema.value))
        .composeGetter(identityGetter())
        .getAll(operation.value);
      const bodySchema = path1
        .composeOptional(Optional.fromNullableProp<Response>()("content"))
        .composeIso(objectToArray())
        .composeOptional(firstElementOptional())
        .composeLens(valueLens())
        .composeOptional(Optional.fromNullableProp<MediaType>()("schema"))
        .getOption(operation.value);
      const headerProperties = {
        ...([...headerSchema0, ...headerSchema1]
            .reduce((a, b) => ({...a, [b[0]]: b[1]}), {})),
      };
      const res = generateMockFromTemplate2(
        statusCode,
        {
          definitions,
          type: "object",
          properties: headerProperties,
          required: Object.keys(headerProperties),
        },
        isNone(bodySchema)
          ? undefined
          : {
              definitions,
              ...(isReference(bodySchema.value)
                ? changeRef(bodySchema.value)
                : changeRefs(bodySchema.value)),
            });
      // Notify call tracker
      const serviceName = toSchemas
        .composeLens(keyLens())
        .getOption(schemaRecord);
      if (!isNone(serviceName) && store.cores[serviceName.value]) {
        store.cores[serviceName.value].track({ req, res });
      }

      listeners.forEach((listener: IListener) => listener.notify({ req, res }));
      jsf.reset();
      return res;
    };
}

const generateMockFromTemplate2 = (
  statusCode: number,
  headerSchema?: any,
  bodySchema?: any,
): ISerializedResponse => {

  jsf.option("alwaysFakeOptionals", false);
  jsf.option("useDefaultValue", false);

  const body = bodySchema ? JSON.stringify(jsf.generate(bodySchema)) : undefined;
  jsf.option("useDefaultValue", true);
  const resHeaders = headerSchema ? jsf.generate(headerSchema) : undefined;
  jsf.option("useDefaultValue", false);

  return {
    body,
    headers: resHeaders,
    statusCode,
  };
};
