/**
 * Implements the logic for generating a response from a service file
 */
// Try fixing broken imports in Node <= 8 by using require instead of default import
const jsf = require("json-schema-faker"); // tslint:disable-line:no-var-requires
import { array } from "fp-ts/lib/Array";
import { fold, isNone, none, Option, some } from "fp-ts/lib/Option";
import { pipe } from "fp-ts/lib/pipeable";
import * as jsonschema from "jsonschema";
import {
  isParameter,
  isResponse,
  MediaType,
  RequestBody,
} from "loas3/dist/generated/full";
import { omit } from "lodash";
import {
  fromTraversable,
  Getter,
  Iso,
  Lens,
  Optional,
  Prism,
  Traversal,
} from "monocle-ts";
import {
  allMethods,
  changeRef,
  changeRefs,
  getComponentFromRef,
  getParameterFromRef,
  getRequestBodyFromRef,
  getResponseFromRef,
  getSchemaFromRef,
  internalGetComponent,
  MethodNames,
  objectToArray,
  valueLens,
} from "openapi-refinements";
import * as url from "whatwg-url";
import {
  CreateResponse,
  IListener,
  ISerializedRequest,
  ISerializedResponse,
  IUnmockOptions,
} from "./interfaces";
import { IRandomNumberGenerator } from "./random-number-generator";
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

export const runnerConfiguration = {
  defaultSeed: 0,
  optionalsProbability: 1.0,
  minItems: 0,
  reset() {
    this.defaultSeed = 0;
    this.minItems = 0;
    this.optionalsProbability = 1.0;
  },
};
/**
 * Finds server URLs that match a given protocol and host
 * @param protocol like http or https
 * @param host like api.foo.com
 * @param o an OpenAPI schema from which the server URLs are taken
 */
export const matchUrls = (
  protocol: string,
  host: string,
  o: OpenAPIObject,
): string[] =>
  o.servers
    ? o.servers
        .map(m => m.url)
        .filter(
          i =>
            new url.URL(i).host === host &&
            new url.URL(i).protocol === `${protocol}:`,
        )
    : [];

const schemaPrism = (oai: OpenAPIObject): Prism<Schema | Reference, Schema> =>
  new Prism(
    s =>
      isReference(s) ? getSchemaFromRef(oai, s.$ref.split("/")[3]) : some(s),
    a => a,
  );
const makeDefinitionsFromSchema = (o: OpenAPIObject): Record<string, Schema> =>
  o.components && o.components.schemas
    ? Object.entries(o.components.schemas).reduce(
        (a, b) => ({
          ...a,
          [b[0]]: isReference(b[1]) ? changeRef(b[1]) : changeRefs(b[1]),
        }),
        {},
      )
    : {};

const findRelevantPath = (
  m: MethodNames,
  a: MethodNames[],
  p: PathItem,
): PathItem =>
  a.length === 0
    ? p // return p once we've exchausted all method names
    : findRelevantPath(
        m,
        a.slice(1),
        /* omit everything but m from p */ a[0] === m ? p : omit(p, a[0]),
      );

/**
 * Take all operations *except* `m` out of a PathItem.
 * @param m An operation (`get`, `post`, etc)
 * @param p A path item.
 */
export const getPathItemWithMethod = (m: MethodNames, p: PathItem): PathItem =>
  findRelevantPath(m, allMethods, p);

const getRequiredRequestQueryOrHeaderParametersInternal = (
  header: boolean,
  t: Traversal<PathItem, Reference | Parameter>,
  oai: OpenAPIObject,
  p: PathItem,
): Parameter[] =>
  t
    .composePrism(
      new Prism(
        s =>
          isReference(s)
            ? getParameterFromRef(oai, s.$ref.split("/")[3])
            : some(s),
        a => a,
      ),
    )
    .composePrism(
      new Prism(
        s =>
          s.in === (header ? "header" : "query") && s.required ? some(s) : none,
        a => a,
      ),
    )
    .composeGetter(new Getter(i => i))
    .getAll(p)
    .filter(a =>
      a.schema ? !isNone(schemaPrism(oai).getOption(a.schema)) : false,
    )
    .map(b => ({
      ...b,
      schema: b.schema
        ? isReference(b.schema)
          ? changeRef(b.schema)
          : changeRefs(b.schema)
        : { type: "string" },
    }));

const getRequiredRequestQueryOrHeaderParameters = (
  header: boolean,
  req: ISerializedRequest,
  oai: OpenAPIObject,
  p: PathItem,
): Parameter[] => [
  ...getRequiredRequestQueryOrHeaderParametersInternal(
    header,
    Optional.fromNullableProp<PathItem>()("parameters").composeTraversal(
      fromTraversable(array)(),
    ),
    oai,
    p,
  ),
  ...getRequiredRequestQueryOrHeaderParametersInternal(
    header,
    Optional.fromNullableProp<PathItem>()(req.method)
      .composeOptional(Optional.fromNullableProp<Operation>()("parameters"))
      .composeTraversal(fromTraversable(array)()),
    oai,
    p,
  ),
];
const getRequiredRequestBodySchemas = (
  req: ISerializedRequest,
  oai: OpenAPIObject,
  p: PathItem,
): Schema[] =>
  Optional.fromNullableProp<PathItem>()(req.method)
    .composeOptional(Optional.fromNullableProp<Operation>()("requestBody"))
    .composePrism(
      new Prism(
        s =>
          isReference(s)
            ? getRequestBodyFromRef(oai, s.$ref.split("/")[3])
            : some(s),
        a => a,
      ),
    )
    .composeOptional(Optional.fromNullableProp<RequestBody>()("content"))
    .composeIso(objectToArray())
    .composeTraversal(fromTraversable(array)())
    .composeLens(valueLens())
    .composeOptional(Optional.fromNullableProp<MediaType>()("schema"))
    .composePrism(schemaPrism(oai))
    .composeGetter(new Getter(i => i))
    .getAll(p);

const keepMethodIfRequiredRequestBodyIsPresent = (
  req: ISerializedRequest,
  oai: OpenAPIObject,
) => (p: PathItem): PathItem =>
  !p[req.method]
    ? p
    : pipe(
        getRequiredRequestBodySchemas(req, oai, p).filter(
          i =>
            !jsonschema.validate(req.bodyAsJson, {
              ...changeRefs(i),
              definitions: makeDefinitionsFromSchema(oai),
            }).valid,
        ).length === 0
          ? some(p)
          : none,
        fold(() => omit(p, req.method), a => a),
      );

const keepMethodIfRequiredHeaderParametersArePresent = (
  req: ISerializedRequest,
  oai: OpenAPIObject,
) => (p: PathItem) =>
  keepMethodIfRequiredQueryOrHeaderParametersArePresent(true, req, oai, p);

const keepMethodIfRequiredQueryPrametersArePresent = (
  req: ISerializedRequest,
  oai: OpenAPIObject,
) => (p: PathItem) =>
  keepMethodIfRequiredQueryOrHeaderParametersArePresent(false, req, oai, p);

const keepMethodIfRequiredQueryOrHeaderParametersArePresent = (
  header: boolean,
  req: ISerializedRequest,
  oai: OpenAPIObject,
  p: PathItem,
): PathItem =>
  !p[req.method]
    ? p
    : pipe(
        getRequiredRequestQueryOrHeaderParameters(header, req, oai, p),
        properties =>
          jsonschema.validate(header ? req.headers || {} : req.query, {
            type: "object",
            properties: properties.reduce(
              (a, b) => ({ ...a, [b.name]: b.schema }),
              {},
            ),
            required: properties.filter(i => i.required).map(i => i.name),
            additionalProperties: true,
            definitions: makeDefinitionsFromSchema(oai),
          }).valid
            ? some(p)
            : none,
        fold(() => omit(p, req.method), a => a),
      );

const maybeAddStringSchema = (
  s: Array<Reference | Schema>,
): Array<Reference | Schema> => (s.length === 0 ? [{ type: "string" }] : s);

const discernName = (o: Option<Parameter>, n: string): Option<Parameter> =>
  isNone(o) || (o.value.name === n && o.value.in === "path") ? o : none;

const internalGetParameter = (
  t: Traversal<PathItem, Reference | Parameter>,
  vname: string,
  pathItem: PathItem,
  oas: OpenAPIObject,
) =>
  t
    .composePrism(
      new Prism(
        i =>
          isReference(i)
            ? discernName(getParameterFromRef(oas, refName(i)), vname)
            : discernName(some(i), vname),
        a => a,
      ),
    )
    .composeOptional(Optional.fromNullableProp<Parameter>()("schema"))
    .composeGetter(identityGetter())
    .getAll(pathItem);

const pathItemPathParameter = (
  vname: string,
  pathItem: PathItem,
  oas: OpenAPIObject,
) =>
  internalGetParameter(
    Optional.fromNullableProp<PathItem>()("parameters").composeTraversal(
      fromTraversable(array)<Reference | Parameter>(),
    ),
    vname,
    pathItem,
    oas,
  );

const operationPathParameter = (
  vname: string,
  pathItem: PathItem,
  operation: MethodNames,
  oas: OpenAPIObject,
) =>
  internalGetParameter(
    Optional.fromNullableProp<PathItem>()(operation)
      .composeOptional(Optional.fromNullableProp<Operation>()("parameters"))
      .composeTraversal(fromTraversable(array)<Reference | Parameter>()),
    vname,
    pathItem,
    oas,
  );

const getMatchingParameters = (
  vname: string,
  pathItem: PathItem,
  operation: MethodNames,
  oas: OpenAPIObject,
) =>
  maybeAddStringSchema([
    ...pathItemPathParameter(vname, pathItem, oas),
    ...operationPathParameter(vname, pathItem, operation, oas),
  ]);

/**
 * Returns parsed JSON or the original if it is not valid JSON
 * @param maybe Perhaps this is JSON, perhaps not
 */
const maybeJson = (maybe: string) => {
  try {
    return JSON.parse(maybe);
  } catch {
    return maybe;
  }
};

/**
 * Matches part of a path against a path parameter with name vname
 * @param part part of a path, ie an id
 * @param vname name of a parameter
 * @param pathItem a path item maybe containing the parameter
 * @param operation the name of the operation to check in case the parameter is in the operation
 * @param oas the schema to traverse to find definitions
 */
const pathParameterMatch = (
  part: string,
  vname: string,
  pathItem: PathItem,
  operation: MethodNames,
  oas: OpenAPIObject,
) =>
  getMatchingParameters(vname, pathItem, operation, oas).filter(
    i =>
      // this is a precaution in case the path
      // is a number or bool and the schema is defined as such
      // so we include the part as itself and as its
      // JSON-parsed equivalent via maybeJson
      ![...new Set([part, maybeJson(part)])].reduce(
        (a, b) =>
          a ||
          jsonschema.validate(b, {
            ...i,
            definitions: makeDefinitionsFromSchema(oas),
          }).valid,
        false,
      ),
  ).length === 0;

const pathParamRegex = new RegExp(/^\{[^}]+\}/gi);

export const matchesInternal = (
  path: string[],
  pathItemKey: string[],
  pathItem: PathItem,
  operation: MethodNames,
  o: OpenAPIObject,
): boolean =>
  // only a match if same length
  path.length === pathItemKey.length &&
  (path.length === 0 || // terminal condition
    ((path[0] === pathItemKey[0] || // either they are equal, or...
      /* is wild card, ie {} */
      (pathItemKey[0].match(pathParamRegex) !== null &&
        pathParameterMatch(
          path[0],
          pathItemKey[0].slice(1, -1),
          pathItem,
          operation,
          o,
        ))) &&
      /* recursion over path */ matchesInternal(
        path.slice(1),
        pathItemKey.slice(1),
        pathItem,
        operation,
        o,
      )));

/**
 * Tests if a path matches an openAPI PathItem key
 * @param path path
 * @param pathItemKey path item key
 */
export const matches = (
  path: string,
  pathItemKey: string,
  pathItem: PathItem,
  method: MethodNames,
  oas: OpenAPIObject,
): boolean =>
  matchesInternal(
    path.split("/").filter(i => i !== ""),
    pathItemKey.split("/").filter(i => i !== ""),
    pathItem,
    method,
    oas,
  );

/**
 * Gets the name of a reference from a reference.
 * ie "#/components/schemas/Foo" => "Foo"
 * @param r A reference
 */
export const refName = (r: Reference): string => r.$ref.split("/")[3];

/**
 * An optional that returns `some` first element of an array
 * if it exists, or `none` if it doesn't.
 */
export const firstElementOptional = <T>() =>
  new Optional<T[], T>(
    s => (s.length > 0 ? some(s[0]) : none),
    a => s => [a, ...s.slice(1)],
  );

/**
 * A lens that zooms into the `key` of a `[key, value]` pair.
 */
export const keyLens = <A, T>() =>
  new Lens<[A, T], A>(a => a[0], a => s => [a, s[1]]);

const getFirstMethodInternal2 = (
  p: PathItem,
  n: MethodNames,
  m: MethodNames[],
  o?: Operation,
): Option<[MethodNames, Operation]> =>
  o ? some([n, o]) : getFirstMethodInternal(m, p);

const getFirstMethodInternal = (
  m: MethodNames[],
  p: PathItem,
): Option<[MethodNames, Operation]> =>
  m.length === 0 ? none : getFirstMethodInternal2(p, m[0], m.slice(1), p[m[0]]);

export const getFirstMethod = (p: PathItem): Option<[MethodNames, Operation]> =>
  getFirstMethodInternal(allMethods, p);

/**
 * Gets `some` random operation (the first one) from a path item
 * or `none` if there are no operations
 * @param p A path item
 */
export const operationOptional = new Optional<
  PathItem,
  [MethodNames, Operation]
>(a => getFirstMethod(a), a => s => ({ ...s, [a[0]]: a[1] }));

/**
 * Gets `some` header from a reference
 * or `none` if the reference doesn't exist
 * @param o an open api object
 * @param d the name of the header reference
 */
export const getHeaderFromRef = (o: OpenAPIObject, d: string): Option<Header> =>
  getComponentFromRef(
    o,
    d,
    a => (a.headers ? some(a.headers) : none),
    internalGetHeaderFromRef,
  );

export const internalGetHeaderFromRef = internalGetComponent(getHeaderFromRef);

export const useIfHeaderLastMile = (
  p: Parameter,
  r: Option<Schema>,
): Option<[string, Schema]> =>
  isNone(r) ? none : some([p.name, r.value || { type: "string" }]);

/**
 * Retursn `some` schema for a parameter if it is a header,
 * else `none`.
 * @param o An open API object.
 * @param p A parameter that may be a header.
 */
export const useIfHeader = (
  o: OpenAPIObject,
  p: Parameter,
): Option<[string, Schema]> =>
  p.in !== "header"
    ? none
    : useIfHeaderLastMile(
        p,
        p.schema
          ? isReference(p.schema)
            ? getSchemaFromRef(o, refName(p.schema))
            : some(p.schema)
          : some({ type: "string" }),
      );

export const identityGetter = <T>() => new Getter<T, T>(i => i);

export const parameterSchema = (o: OpenAPIObject) =>
  new Optional<Parameter, [string, Schema]>(
    a => useIfHeader(o, a),
    a => s => ({ ...s, name: a[0], schema: a[1] }),
  );

const cutPath = (paths: string[], path: string): string =>
  paths.length === 0
    ? path
    : path.slice(0, paths[0].length) === paths[0]
    ? path.slice(paths[0].length)
    : cutPath(paths.slice(1), path);

const removeTrailingSlash = (s: string) =>
  s.length === 0 ? s : s.slice(-1) === "/" ? s.slice(0, -1) : s;

/**
 * Truncates the path in a request to a path useable by OpenAPI by
 * removing the part included in the server URL.
 * @param path A pathname from a request
 * @param o An open api schema
 * @param i A request object
 */
export const truncatePath = (
  path: string,
  o: OpenAPIObject,
  i: ISerializedRequest,
) =>
  cutPath(
    matchUrls(i.protocol, i.host, o).map(u =>
      removeTrailingSlash(new url.URL(u).pathname),
    ),
    path,
  );

/**
 * A matcher that takes a request and a dictionary of
 * openAPI schema and returns a dictionary containing
 * *only* the schema with *only* the path item and *only*
 * the method corresponding to the request. This will be
 * an empty dictionary if the schema does not exist,
 * empty PathItems if the path does not exist, and
 * empty operations if the method does not exist.
 * @param req The request
 * @param r The dictionary of open api objects.
 */
export const matcher = (
  req: ISerializedRequest,
  r: Record<string, OpenAPIObject>,
): Record<string, OpenAPIObject> =>
  objectToArray<OpenAPIObject>()
    .composeTraversal(fromTraversable(array)())
    .composeLens(valueLens())
    .modify(oai =>
      Optional.fromNullableProp<OpenAPIObject>()("paths")
        .composeIso(objectToArray<PathItem>())
        .composeTraversal(fromTraversable(array)())
        .composeLens(valueLens())
        .modify(pathItem =>
          pipe(
            getPathItemWithMethod(req.method, pathItem),
            keepMethodIfRequiredHeaderParametersArePresent(req, oai),
            keepMethodIfRequiredQueryPrametersArePresent(req, oai),
            keepMethodIfRequiredRequestBodyIsPresent(req, oai),
          ),
        )({
        ...oai,
        ...(oai.paths
          ? {
              paths: Object.entries(oai.paths).reduce(
                (i, [n, o]) => ({
                  ...i,
                  ...(matches(
                    truncatePath(req.pathname, oai, req),
                    n,
                    o,
                    req.method,
                    oai,
                  )
                    ? { [n]: o }
                    : {}),
                }),
                {},
              ),
            }
          : {}),
      }),
    )(
    Object.entries(r).reduce(
      (i, [n, o]) => ({
        ...i,
        ...(matchUrls(req.protocol, req.host, o).length > 0 ? { [n]: o } : {}),
      }),
      {},
    ),
  );

/**
 * When transformers are provided to services, the service only
 * knows its own schema, not the full dictionary of schemas.
 * This function "hoists" a transformer from OpenAPI to a record of OpenAPI
 * schemas so that it can be used as a top-level transformer.
 * This way, it will ignore all requests to URLs that are not server URLs
 * for the schema (see the filter operation).
 * @param f A function from openAPI to openAPI.
 */
export const hoistTransformer = (
  f: (req: ISerializedRequest, r: OpenAPIObject) => OpenAPIObject,
) => (
  req: ISerializedRequest,
  r: Record<string, OpenAPIObject>,
): Record<string, OpenAPIObject> =>
  objectToArray<OpenAPIObject>()
    .composeTraversal(
      fromTraversable(array)<[string, OpenAPIObject]>().filter(
        ([__, o]) => matchUrls(req.protocol, req.host, o).length > 0,
      ),
    )
    .composeLens(valueLens())
    .modify(oai =>
      f(
        {
          ...req,
          path: truncatePath(req.path, oai, req),
          pathname: truncatePath(req.pathname, oai, req),
        },
        oai,
      ),
    )(r);

const toSchemas = objectToArray<OpenAPIObject>().composeOptional(
  firstElementOptional(),
);
const toSchema = toSchemas.composeLens(valueLens());

/**
 * Retrieves an operation from a path item from a schema
 * in a record of open api schemas.
 * Only makes sense if the matcher has been one, which guarantees:
 * - there is at most one schema in the record
 * - there is at most one path item in the schema
 * - there is at most one operation in the path item
 * It will still work if this is not the case, but it will
 * pick a random schema, path item and operation, which
 * will lead to nonsensical results.
 * @param schemaRecord the Record<string, OpenAPISchema> that we
 *   are getting the operation from.
 */
const drillDownToOperation = (schemaRecord: Record<string, OpenAPIObject>) =>
  toSchema
    .composeOptional(Optional.fromNullableProp<OpenAPIObject>()("paths"))
    .composeIso(objectToArray())
    .composeOptional(firstElementOptional())
    .composeLens(valueLens())
    .composeOptional(operationOptional)
    .composeLens(valueLens())
    .getOption(schemaRecord);

/**
 * Gets headers from the parameters of an operations
 * @param schema A schema to get any definitions from for references.
 * @param operation An operation that may or may not contain parameters
 */
const headersFromOperation = (schema: OpenAPIObject, operation: Operation) =>
  Optional.fromNullableProp<Operation>()("parameters")
    .composeTraversal(fromTraversable(array)())
    .composePrism(
      new Prism(
        s =>
          isParameter(s)
            ? some(s)
            : isReference(s)
            ? getParameterFromRef(schema, refName(s))
            : none,
        a => a,
      ),
    )
    .composeOptional(parameterSchema(schema))
    .composeGetter(identityGetter())
    .getAll(operation);

/**
 * Makes lense to a single response from an operation
 * @param schema A schema containing definitions of responses
 * @param code The response code corresponding to the response we want
 */
const makeLensToResponseStartingFromOperation = (
  schema: OpenAPIObject,
  code: keyof Responses,
) =>
  Optional.fromNullableProp<Operation>()("responses")
    .composeOptional(Optional.fromNullableProp<Responses>()(code))
    .composePrism(
      new Prism(
        s =>
          isResponse(s)
            ? some(s)
            : isReference(s)
            ? getResponseFromRef(schema, refName(s))
            : none,
        a => a,
      ),
    );

const stringHeader = (n: string, o: Option<Header>): Option<[string, Header]> =>
  isNone(o) ? none : some([n, o.value]);

/**
 * Gets headers from a response
 * @param schema A schema to get any definitions from for references.
 * @param operation An operation that may or may not contain parameters
 * @param code The response code corresponding to the response we want
 */
const headersFromResponse = (
  schema: OpenAPIObject,
  operation: Operation,
  code: keyof Responses,
) =>
  makeLensToResponseStartingFromOperation(schema, code)
    .composeOptional(Optional.fromNullableProp<Response>()("headers"))
    .composeIso(objectToArray())
    .composeTraversal(fromTraversable(array)())
    .composePrism(
      new Prism<[string, Reference | Header], [string, Header]>(
        a =>
          isReference(a[1])
            ? stringHeader(a[0], getHeaderFromRef(schema, refName(a[1])))
            : some([a[0], a[1]]),
        a => a,
      ),
    )
    .composeIso(
      new Iso<[string, Header], Parameter>(
        a => ({ ...a[1], name: a[0], in: "header" }),
        a => [a.name, a],
      ),
    )
    .composeOptional(parameterSchema(schema))
    .composeGetter(identityGetter())
    .getAll(operation);

/**
 * Gets a body schema from a response
 * @param schema A schema to get any definitions from for references.
 * @param operation An operation that may or may not contain parameters
 * @param code The response code corresponding to the response we want
 */
const bodyFromResponse = (
  schema: OpenAPIObject,
  operation: Operation,
  code: keyof Responses,
) =>
  makeLensToResponseStartingFromOperation(schema, code)
    .composeOptional(Optional.fromNullableProp<Response>()("content"))
    .composeIso(objectToArray())
    .composeOptional(firstElementOptional())
    .composeLens(valueLens())
    .composeOptional(Optional.fromNullableProp<MediaType>()("schema"))
    .getOption(operation);

export function responseCreatorFactory({
  listeners = [],
  options,
  rng,
  store,
}: {
  listeners?: IListener[];
  options: IUnmockOptions;
  rng: IRandomNumberGenerator;
  store: ServiceStore;
}): CreateResponse {
  return (req: ISerializedRequest) => {
    const transformers = [
      // first transformer is the matcher
      matcher,
      // subsequent developer-defined transformers
      ...Object.values(store.cores).map(core =>
        hoistTransformer(core.transformer),
      ),
    ];
    const schemas = Object.entries(store.cores).reduce(
      (a, [n, x]) => ({ ...a, [n]: x.schema }),
      {},
    );
    const schemaRecord = transformers.reduce((a, b) => b(req, a), schemas);
    const schema: Option<OpenAPIObject> = toSchema.getOption(schemaRecord);
    const operation: Option<Operation> = drillDownToOperation(schemaRecord);
    if (isNone(operation) || isNone(schema)) {
      throw Error(
        `Cannot find a matcher for this request: ${JSON.stringify(
          req,
          null,
          2,
        )}`,
      );
    }
    const codes: Array<keyof Responses> = Object.keys(
      operation.value.responses,
    ) as Array<keyof Responses>;
    const code = codes[Math.floor(Math.random() * codes.length)];
    const statusCode = code === "default" ? 500 : +code;
    const definitions = makeDefinitionsFromSchema(schema.value);
    const operationLevelHeaders = headersFromOperation(
      schema.value,
      operation.value,
    );
    const responseLevelHeaders = headersFromResponse(
      schema.value,
      operation.value,
      code,
    );
    const bodySchema = bodyFromResponse(schema.value, operation.value, code);
    // all headers as properties in an object
    const headerProperties = {
      ...[...operationLevelHeaders, ...responseLevelHeaders].reduce(
        (a, b) => ({ ...a, [b[0]]: b[1] }),
        {},
      ),
    };

    /**
     * Ensure that every generation starts from the same seed if not randomizing.
     */
    if (!options.randomize) {
      rng.setSeed(runnerConfiguration.defaultSeed);
    }

    const res = generateMockFromTemplate({
      rng: () => rng.get(),
      statusCode,
      headerSchema: {
        definitions,
        type: "object",
        properties: headerProperties,
        required: Object.keys(headerProperties),
      },
      bodySchema: isNone(bodySchema)
        ? undefined
        : {
            definitions,
            ...(isReference(bodySchema.value)
              ? changeRef(bodySchema.value)
              : changeRefs(bodySchema.value)),
          },
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

const generateMockFromTemplate = ({
  rng,
  statusCode,
  headerSchema,
  bodySchema,
}: {
  rng: () => number;
  statusCode: number;
  headerSchema?: any;
  bodySchema?: any;
}): ISerializedResponse => {
  jsf.extend("faker", () => require("faker"));
  jsf.option("optionalsProbability", runnerConfiguration.optionalsProbability);
  // When optionalsProbability is set to 100%, generate exactly 100% of all optionals.
  // otherwise, generate up to optionalsProbability% of optionals
  jsf.option(
    "fixedProbabilities",
    runnerConfiguration.optionalsProbability === 1,
  );
  // disables this temporarily as it messes with user-defined min items
  // jsf.option("minItems", runnerConfiguration.minItems);
  // jsf.option("minLength", runnerConfiguration.minItems);
  jsf.option("useDefaultValue", false);
  jsf.option("random", rng);
  const bodyAsJson = bodySchema ? jsf.generate(bodySchema) : undefined;
  const body = bodyAsJson ? JSON.stringify(bodyAsJson) : undefined;
  jsf.option("useDefaultValue", true);
  const resHeaders = headerSchema ? jsf.generate(headerSchema) : undefined;
  jsf.option("useDefaultValue", false);

  return {
    body,
    bodyAsJson,
    headers: resHeaders,
    statusCode,
  };
};
