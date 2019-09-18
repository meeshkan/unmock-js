import {
Components,
Header,
isHeader,
isOperation,
isParameter,
isReference,
isRequestBody,
isResponse,
MediaType,
OpenAPIObject,
Operation,
Parameter,
PathItem,
Reference,
RequestBody,
Response,
Responses,
Schema,
} from "loas3/dist/generated/full";

import * as jsonschema from "jsonschema";

import { array } from "fp-ts/lib/Array";
import { fold, isNone, none, Option, some } from "fp-ts/lib/Option";
import { JSONValue } from "json-schema-strictly-typed";
import {
fromTraversable,
Getter,
Iso,
Lens,
Optional,
Prism,
Traversal
} from "monocle-ts";

const APPLICATION_JSON = "application/json";
export const objectToArray = <T>() =>
new Iso<Record<string, T>, Array<[string, T]>>(
    s => Object.entries(s),
    a => a.reduce((q, r) => ({ ...q, [r[0]]: r[1] }), {})
);

export const valueLens = <A, T>() =>
new Lens<[A, T], T>(s => s[1], a => s => [s[0], a]);

export type MethodNames =
| "get"
| "post"
| "put"
| "delete"
| "options"
| "head"
| "patch"
| "trace";
export const allMethods: MethodNames[] = [
"get",
"post",
"put",
"delete",
"options",
"head",
"patch",
"trace"
];

export const internalGetComponent = <C>(
f: (o: OpenAPIObject, d: string) => Option<C>
) => (o: OpenAPIObject, i: C | Reference): Option<C> =>
i ? (isReference(i) ? f(o, i.$ref.split("/")[3]) : some(i)) : none;

export const getComponentFromRef = <C>(
o: OpenAPIObject,
d: string,
accessor: (o: Components) => Option<Record<string, Reference | C>>,
getter: (o: OpenAPIObject, i: C | Reference) => Option<C>
): Option<C> =>
new Getter((a: OpenAPIObject) => (a.components ? some(a.components) : none))
    .composeGetter<Option<Record<string, C | Reference>>>(
    new Getter(
        fold<Components, Option<Record<string, C | Reference>>>(
        () => none,
        a => accessor(a)
        )
    )
    )
    .composeGetter<Option<C>>(
    new Getter(
        fold<Record<string, C | Reference>, Option<C>>(
        () => none,
        a => getter(o, a[d])
        )
    )
    )
    .get(o);

export const getResponseFromRef = (
o: OpenAPIObject,
d: string
): Option<Response> =>
getComponentFromRef(
    o,
    d,
    a => (a.responses ? some(a.responses) : none),
    internalGetResponseFromRef
);

export const getHeaderFromRef = (o: OpenAPIObject, d: string): Option<Header> =>
getComponentFromRef(
    o,
    d,
    a => (a.headers ? some(a.headers) : none),
    internalGetHeaderFromRef
);

export const getParameterFromRef = (
o: OpenAPIObject,
d: string
): Option<Parameter> =>
getComponentFromRef(
    o,
    d,
    a => (a.parameters ? some(a.parameters) : none),
    internalGetParameterFromRef
);

export const getRequestBodyFromRef = (
o: OpenAPIObject,
d: string
): Option<RequestBody> =>
getComponentFromRef(
    o,
    d,
    a => (a.requestBodies ? some(a.requestBodies) : none),
    internalGetRequestBodyFromRef
);

export const getSchemaFromRef = (o: OpenAPIObject, d: string): Option<Schema> =>
getComponentFromRef(
    o,
    d,
    a => (a.schemas ? some(a.schemas) : none),
    internalGetSchemaFromRef
);

const internalGetRequestBodyFromRef = internalGetComponent(getRequestBodyFromRef);
const internalGetResponseFromRef = internalGetComponent(getResponseFromRef);
const internalGetParameterFromRef = internalGetComponent(getParameterFromRef);
const internalGetSchemaFromRef = internalGetComponent(getSchemaFromRef);
const internalGetHeaderFromRef = internalGetComponent(getHeaderFromRef);

/// TODO: combine with above?

const lensToPath = (path: RegExp | boolean) =>
Lens.fromProp<OpenAPIObject>()("paths")
    .composeIso(objectToArray())
    .composeTraversal(
    fromTraversable(array)<[string, PathItem]>().filter(i =>
        typeof path === "boolean" ? path : path.test(i[0])
    )
    )
    .composeLens(valueLens());

const discernParameter = (
o: Option<Parameter>,
name: string | boolean,
inn: string | boolean
): Option<Parameter> =>
isNone(o)
    ? o
    : (typeof inn === "boolean" ? inn : o.value.in === inn) &&
    (typeof name === "boolean" ? name : o.value.name === name)
    ? o
    : none;

const pathParameterInternal = (
o: OpenAPIObject,
path: RegExp | boolean,
name: string | boolean,
inn: string | boolean
) =>
handleParametersInternal(
    o,
    lensToPath(path).composeOptional(
    Optional.fromNullableProp<PathItem>()("parameters")
    ),
    name,
    inn
);

const requestBodyInternal = (
o: OpenAPIObject,
path: RegExp | boolean,
operations: MethodNames[] | boolean,
mediaTypes: string[] | boolean
) =>
lensToOperations(path, operations)
    .composeOptional(Optional.fromNullableProp<Operation>()("requestBody"))
    .composePrism(
    new Prism<Reference | RequestBody, RequestBody>(
        s =>
        isRequestBody(s)
            ? some(s)
            : isReference(s)
            ? getRequestBodyFromRef(o, s.$ref.split("/")[3])
            : none,
        a => a
    )
    )
    .composeOptional(Optional.fromNullableProp<RequestBody>()("content"))
    // TODO: this is a code dup from elsewhere...
    .composeIso(objectToArray<MediaType>())
    .composeTraversal(
    fromTraversable(array)<[string, MediaType]>().filter(i =>
        typeof mediaTypes === "boolean"
        ? mediaTypes
        : mediaTypes.indexOf(i[0]) >= 0
    )
    )
    .composeLens(valueLens())
    .composeOptional(Optional.fromNullableProp<MediaType>()("schema"));

const methodParameterInternal = (
o: OpenAPIObject,
path: RegExp | boolean,
operations: MethodNames[] | boolean,
name: string | boolean,
inn: string | boolean
) =>
handleParametersInternal(
    o,
    lensToOperations(path, operations).composeOptional(
    Optional.fromNullableProp<Operation>()("parameters")
    ),
    name,
    inn
);

const handleParametersInternal = (
o: OpenAPIObject,
t: Traversal<OpenAPIObject, Array<Reference | Parameter>>,
name: string | boolean,
inn: string | boolean
) =>
t
    .composeTraversal(fromTraversable(array)<Reference | Parameter>())
    .composePrism(
    new Prism<Reference | Parameter, Parameter>(
        s =>
        isParameter(s)
            ? discernParameter(some(s), name, inn)
            : isReference(s)
            ? discernParameter(
                getParameterFromRef(o, s.$ref.split("/")[3]),
                name,
                inn
            )
            : none,
        a => a
    )
    )
    .composeOptional(Optional.fromNullableProp<Parameter>()("schema"));

const lensToOperations = (
path: RegExp | boolean,
operations: MethodNames[] | boolean
) =>
lensToPath(path)
    .composeIso(objectToArray<any>())
    .composeTraversal(
    fromTraversable(array)<[string, any]>().filter(i =>
        typeof operations === "boolean"
        ? operations
        : operations.map(z => `${z}`).indexOf(i[0]) !== -1
    )
    )
    .composeLens(valueLens())
    .composePrism(
    new Prism<any, Operation>(s => (isOperation(s) ? some(s) : none), a => a)
    );
const lensToResponses = (
path: RegExp | boolean,
operations: MethodNames[] | boolean
) =>
lensToOperations(path, operations).composeLens(
    Lens.fromProp<Operation>()("responses")
);

const minItems = (i: number) => (s: Schema): Schema => ({
...s,
...(s.type === "array" || s.items
    ? {
        minItems:
        typeof s.minItems === "number" && s.minItems > i ? s.minItems : i
    }
    : {})
});

const maxItems = (i: number) => (s: Schema): Schema => ({
...s,
...(s.type === "array" || s.items
    ? {
        maxItems:
        typeof s.maxItems === "number" && s.maxItems < i ? s.maxItems : i
    }
    : {})
});

const requiredStatus = (prop: string) => (s: Schema): Schema => ({
...s,
...(s.properties && s.properties[prop]
    ? { required: s.required ? [...new Set(s.required.concat(prop))] : [prop] }
    : {})
});

const filterSchemaList = (
i: number[],
key: "anyOf" | "oneOf",
l: Array<Reference | Schema> | undefined,
keep: boolean
) =>
l
    ? {
        [key]: l.filter((_, b) =>
        keep ? i.indexOf(b) >= 0 : i.indexOf(b) === -1
        )
    }
    : {};
const changeAnyOne = (i: number[], key: "anyOf" | "oneOf", keep: boolean) => (
s: Schema
): Schema => ({
...s,
...filterSchemaList(i, key, s[key], keep)
});

const itemsToList = (
i: number,
items: Reference | Schema
): Array<Reference | Schema> => new Array(i).fill(0).map(_ => items);
const listToTuple = (i: number) => (s: Schema): Schema => ({
...s,
...(s.items &&
!(s.items instanceof Array) &&
(!s.minItems || i >= s.minItems) &&
(!s.maxItems || i <= s.maxItems)
    ? { items: itemsToList(i, s.items) }
    : {})
});

const valAsConst = (val: JSONValue): Schema =>
val === null
    ? { type: "null" }
    : typeof val === "number"
    ? { type: "number", enum: [val] }
    : typeof val === "boolean"
    ? { type: "boolean", enum: [val] }
    : typeof val === "string"
    ? { type: "string", enum: [val] }
    : val instanceof Array
    ? { type: "array", items: val.map(i => valAsConst(i)) }
    : typeof val === "object"
    ? {
        type: "object",
        properties: Object.entries(val).reduce(
        (a, b) => ({ ...a, [b[0]]: valAsConst(b[1]) }),
        {}
        ),
        required: Object.keys(val)
    }
    : { type: "string" };

const toConstInternal = (
val: JSONValue,
definitions: Record<string, Reference | Schema>,
s: Schema,
original: Schema
): Schema =>
jsonschema.validate(val, {
    ...s,
    definitions
}).valid
    ? valAsConst(val)
    : original;

export const changeRef = (j: Reference): Reference => ({
$ref: `#/definitions/${j.$ref.split("/")[3]}`
});
export const changeRefs = (j: Schema): Schema => ({
...j,
...(isReference(j.additionalProperties)
    ? { additionalProperties: changeRef(j.additionalProperties) }
    : j.additionalProperties === undefined
    ? {}
    : typeof j.additionalProperties === "boolean"
    ? { additionalProperties: {} }
    : { additionalProperties: changeRefs(j.additionalProperties) }),
...(isReference(j.items)
    ? { items: changeRef(j.items) }
    : j.items === undefined
    ? {}
    : j.items instanceof Array
    ? {
        items: j.items.map(i => (isReference(i) ? changeRef(i) : changeRefs(i)))
    }
    : { items: changeRefs(j.items) }),
...(j.properties
    ? {
        properties: Object.entries(j.properties).reduce(
        (a, b) => ({
            ...a,
            [b[0]]: isReference(b[1]) ? changeRef(b[1]) : changeRefs(b[1])
        }),
        {}
        )
    }
    : {})
});

const toConst = (val: JSONValue) => (o: OpenAPIObject) => (s: Schema): Schema =>
toConstInternal(
    val,
    Object.entries(
    o.components && o.components.schemas ? o.components.schemas : {}
    ).reduce(
    (a, b) => ({
        ...a,
        [b[0]]: isReference(b[1]) ? changeRef(b[1]) : changeRefs(b[1])
    }),
    {}
    ),
    changeRefs(s),
    s
);

const addOpenApi = (a: (s: Schema) => Schema) => (_: OpenAPIObject) => a;

const drillDownSchemaProperty = (o: OpenAPIObject, i: string) =>
Optional.fromNullableProp<Schema>()("properties")
    .composeOptional(
    Optional.fromNullableProp<Record<string, Schema | Reference>>()(i)
    )
    .composePrism(
    new Prism(
        s =>
        isReference(s) ? getSchemaFromRef(o, s.$ref.split("/")[3]) : some(s),
        a => a
    )
    );

const drillDownSchemaItemOrAdditionalProperties = (
i: "items" | "additionalProperties"
) => (o: OpenAPIObject) =>
Optional.fromNullableProp<Schema>()(i).composePrism(
    new Prism(
    s =>
        isReference(s)
        ? getSchemaFromRef(o, s.$ref.split("/")[3])
        : s instanceof Array
        ? none
        : typeof s === "boolean"
        ? some({})
        : some(s),
    a => a
    )
);

const drillDownSchemaItem = drillDownSchemaItemOrAdditionalProperties("items");
const drillDownSchemaAdditionalProperties = drillDownSchemaItemOrAdditionalProperties(
"additionalProperties"
);

const drillDownSchemaItems = (o: OpenAPIObject, i: number) =>
Optional.fromNullableProp<Schema>()("items")
    .composePrism(
    new Prism<
        Schema | Reference | Array<Schema | Reference>,
        Array<Schema | Reference>
    >(a => (a instanceof Array ? some(a) : none), a => a)
    )
    .composeOptional(
    new Optional<Array<Schema | Reference>, Schema | Reference>(
        a => (a[i] ? some(a[i]) : none),
        a => s => [...[...s].splice(0, i), a, ...[...s].splice(i + 1)]
    )
    )
    .composePrism(
    new Prism(
        s =>
        isReference(s) ? getSchemaFromRef(o, s.$ref.split("/")[3]) : some(s),
        a => a
    )
    );

export const Arr: unique symbol = Symbol();
export const Addl: unique symbol = Symbol();
const drillDownSchemaOneLevel = (
o: OpenAPIObject,
i: string | typeof Arr | number | typeof Addl
) =>
i === Arr
    ? drillDownSchemaItem(o)
    : i === Addl
    ? drillDownSchemaAdditionalProperties(o)
    : typeof i === "number"
    ? drillDownSchemaItems(o, i)
    : drillDownSchemaProperty(o, i);

const lensToResponse = (
o: OpenAPIObject,
path: RegExp | boolean,
operations: MethodNames[] | boolean,
responses: Array<keyof Responses> | boolean | boolean
) =>
lensToResponses(path, operations)
    .composeIso(objectToArray<any>())
    .composeTraversal(
    fromTraversable(array)<[string, any]>().filter(i =>
        typeof responses === "boolean"
        ? responses
        : responses.map(z => `${z}`).indexOf(i[0]) !== -1
    )
    )
    .composeLens(valueLens())
    .composePrism(
    new Prism(
        s =>
        isResponse(s)
            ? some(s)
            : isReference(s)
            ? getResponseFromRef(o, s.$ref.split("/")[3])
            : none,
        a => a
    )
    );

const headerInternal = (
o: OpenAPIObject,
path: RegExp | boolean,
operations: MethodNames[] | boolean,
responses: Array<keyof Responses> | boolean | boolean,
name: string | boolean
) =>
lensToResponse(o, path, operations, responses)
    .composeOptional(Optional.fromNullableProp<Response>()("headers"))
    .composeIso(objectToArray())
    .composeTraversal(
    fromTraversable(array)<[string, Reference | Header]>().filter(i =>
        typeof name === "boolean" ? name : name === i[0]
    )
    )
    .composeLens(valueLens())
    .composePrism(
    new Prism(
        s =>
        isHeader(s)
            ? some(s)
            : isReference(s)
            ? getHeaderFromRef(o, s.$ref.split("/")[3])
            : none,
        a => a
    )
    )
    .composeOptional(Optional.fromNullableProp<Header>()("schema"));

const responseBodyInternal = (
o: OpenAPIObject,
path: RegExp | boolean,
operations: MethodNames[] | boolean,
responses: Array<keyof Responses> | boolean | boolean,
mediaTypes: string[] | boolean
) =>
lensToResponse(o, path, operations, responses)
    .composeOptional(Optional.fromNullableProp<Response>()("content"))
    .composeIso(objectToArray<MediaType>())
    .composeTraversal(
    fromTraversable(array)<[string, MediaType]>().filter(i =>
        typeof mediaTypes === "boolean"
        ? mediaTypes
        : mediaTypes.indexOf(i[0]) >= 0
    )
    )
    .composeLens(valueLens())
    .composeOptional(Optional.fromNullableProp<MediaType>()("schema"));

export const responseBody = (
path: string | RegExp | boolean = true,
methods: MethodNames | MethodNames[] | boolean = true,
responses: Array<keyof Responses> | boolean = true,
mediaTypes: string[] | boolean = [APPLICATION_JSON]
) => (o: OpenAPIObject): Traversal<OpenAPIObject, Reference | Schema> =>
responseBodyInternal(
    o,
    coaxPath(path),
    coaxMethods(methods),
    responses,
    mediaTypes
);

export const header = (
path: string | RegExp | boolean = true,
methods: MethodNames | MethodNames[] | boolean = true,
responses: Array<keyof Responses> | boolean = true,
name: string | boolean
) => (o: OpenAPIObject): Traversal<OpenAPIObject, Reference | Schema> =>
headerInternal(o, coaxPath(path), coaxMethods(methods), responses, name);

export const pathParameter = (
path: string | RegExp | boolean,
name: string | boolean,
inn: string | boolean
) => (o: OpenAPIObject): Traversal<OpenAPIObject, Reference | Schema> =>
pathParameterInternal(o, coaxPath(path), name, inn);

export const methodParameter = (
path: string | RegExp | boolean,
operations: MethodNames | MethodNames[] | boolean,
name: string | boolean,
inn: string | boolean
) => (o: OpenAPIObject): Traversal<OpenAPIObject, Reference | Schema> =>
methodParameterInternal(
    o,
    coaxPath(path),
    coaxMethods(operations),
    name,
    inn
);

export const requestBody = (
path: string | RegExp | boolean = true,
operations: MethodNames | MethodNames[] | boolean = true,
mediaTypes: string[] | boolean = true
) => (o: OpenAPIObject): Traversal<OpenAPIObject, Reference | Schema> =>
requestBodyInternal(o, coaxPath(path), coaxMethods(operations), mediaTypes);

export const changeSingleSchema = (
s2s: (o: OpenAPIObject) => (s: Schema) => Schema
) => (
traversal: (o: OpenAPIObject) => Traversal<OpenAPIObject, Reference | Schema>,
path: Array<string | typeof Arr | number | typeof Addl>
) => (o: OpenAPIObject) =>
traversal(o)
    .composePrism(
    new Prism(
        s =>
        isReference(s) ? getSchemaFromRef(o, s.$ref.split("/")[3]) : some(s),
        a => a
    )
    )
    .modify(
    path.reduceRight(
        (cur, mxt) => drillDownSchemaOneLevel(o, mxt).modify(cur),
        s2s(o)
    )
    )(o);

const cEnum = (a: any[], keep: boolean) => (s: Schema): Schema => ({
...s,
...(s.enum
    ? {
        enum: s.enum.filter(i =>
        keep ? a.indexOf(i) >= 0 : a.indexOf(i) === -1
        )
    }
    : {})
});

export const changeMinItems = (i: number) =>
changeSingleSchema(addOpenApi(minItems(i)));
export const changeMaxItems = (i: number) =>
changeSingleSchema(addOpenApi(maxItems(i)));
export const changeEnum = (a: any[], keep: boolean) =>
changeSingleSchema(addOpenApi(cEnum(a, keep)));
export const changeRequiredStatus = (s: string) =>
changeSingleSchema(addOpenApi(requiredStatus(s)));
export const changeToConst = (v: JSONValue) => changeSingleSchema(toConst(v));
const codesInternal = (
o: OpenAPIObject,
path: RegExp | boolean,
operations: MethodNames[] | boolean,
responsesMap: (z: Responses) => Responses
) => lensToResponses(path, operations).modify(responsesMap)(o);
export const changeListToTuple = (i: number) =>
changeSingleSchema(addOpenApi(listToTuple(i)));
export const anyOfKeep = (i: number[]) =>
changeSingleSchema(addOpenApi(changeAnyOne(i, "anyOf", true)));
export const anyOfReject = (i: number[]) =>
changeSingleSchema(addOpenApi(changeAnyOne(i, "anyOf", false)));
export const oneOfKeep = (i: number[]) =>
changeSingleSchema(addOpenApi(changeAnyOne(i, "oneOf", true)));
export const oneOfReject = (i: number[]) =>
changeSingleSchema(addOpenApi(changeAnyOne(i, "oneOf", false)));

const coaxPath = (path: string | RegExp | boolean) =>
typeof path === "string" ? new RegExp(`^${path}$`) : path;

const coaxMethods = (methods: MethodNames | MethodNames[] | boolean) =>
typeof methods === "boolean" || methods instanceof Array
    ? methods
    : [methods];

const includeCodesInternal = (
o: OpenAPIObject,
path: RegExp | boolean,
operations: MethodNames[] | boolean,
r: Array<keyof Responses> | boolean
) =>
codesInternal(
    o,
    path,
    operations,
    typeof r === "boolean"
    ? z => (r ? z : {})
    : z => r.map(i => ({ [i]: z[i] })).reduce((a, b) => ({ ...a, ...b }), {})
);

export const includeCodes = (
path: string | RegExp | boolean = true,
operations: MethodNames | MethodNames[] | boolean = true,
r: Array<keyof Responses> | boolean = true
) => (o: OpenAPIObject): OpenAPIObject =>
includeCodesInternal(o, coaxPath(path), coaxMethods(operations), r);

const removeCode = (r: Responses, c: keyof Responses) => {
const out = { ...r };
delete out[c];
return out;
};

const removeCodesInternal = (
o: OpenAPIObject,
path: RegExp | boolean,
operations: MethodNames[] | boolean,
r: Array<keyof Responses> | boolean
) =>
codesInternal(
    o,
    path,
    operations,
    typeof r === "boolean" ? z => (r ? {} : z) : z => r.reduce(removeCode, z)
);

export const removeCodes = (
path: string | RegExp | boolean = true,
operations: MethodNames | MethodNames[] | boolean = true,
r: Array<keyof Responses> | boolean = true
) => (o: OpenAPIObject): OpenAPIObject =>
removeCodesInternal(o, coaxPath(path), coaxMethods(operations), r);

const mapDefaultToCodesFunction = (b: Array<keyof Responses>) => (r: Responses): Responses =>
  Object.entries(r)
    .concat(r.default ? b.map(i => [i, r.default]) : [])
    .reduce((a, z) => ({ ...a, [z[0]]: z[1]}), {});

const mapDefaultToCodesInternal = (
o: OpenAPIObject,
path: RegExp | boolean,
operations: MethodNames[] | boolean,
r: Array<keyof Responses>
) =>
  codesInternal(
    o,
    path,
    operations,
    mapDefaultToCodesFunction(r),
  );

export const mapDefaultToCodes = (
path: string | RegExp | boolean = true,
operations: MethodNames | MethodNames[] | boolean = true,
r: Array<keyof Responses> = []
) => (o: OpenAPIObject): OpenAPIObject =>
mapDefaultToCodesInternal(o, coaxPath(path), coaxMethods(operations), r);