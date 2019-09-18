import {
  Addl,
  anyOfKeep,
  anyOfReject,
  Arr,
  changeEnum,
  changeListToTuple,
  changeMaxItems,
  changeMinItems,
  changeRequiredStatus,
  changeSingleSchema,
  changeToConst,
  header,
  includeCodes,
  MethodNames,
  methodParameter,
  oneOfKeep,
  oneOfReject,
  pathParameter,
  removeCodes,
  requestBody,
  responseBody
} from "openapi-refinements";
export { Arr, Addl } from "openapi-refinements";
import { JSONValue } from "json-schema-strictly-typed";
import { isEqual } from "lodash";
import { Traversal } from "monocle-ts";
import { CodeAsInt, ISerializedRequest, IStateTransformer } from "./interfaces";
import {
  OpenAPIObject,
  Reference,
  Responses,
  Schema
} from "./service/interfaces";

const codeConvert = (c: CodeAsInt | keyof Responses): keyof Responses =>
  `${c}` as (keyof Responses);

const withOrWithoutCodes = (withOrWithout: boolean) => (
  codes: keyof Responses | CodeAsInt | Array<keyof Responses | CodeAsInt>,
  path?: string | RegExp | boolean,
  method?: MethodNames | MethodNames[] | boolean
) => (_: ISerializedRequest, o: OpenAPIObject) =>
  (withOrWithout ? includeCodes : removeCodes)(
    path !== undefined ? path : true,
    method !== undefined ? method : true,
    (codes instanceof Array ? codes : [codes]).map(codeConvert)
  )(o);

const withCodes = withOrWithoutCodes(true);
const withoutCodes = withOrWithoutCodes(false);

interface ISchemaAddress {
  lens?: Array<string | number | typeof Arr | typeof Addl>;
}

interface IResponseBodyOptions extends ISchemaAddress {
  path: string | RegExp | boolean;
  method: MethodNames | MethodNames[] | boolean;
  code:
    | CodeAsInt
    | keyof Responses
    | Array<CodeAsInt | keyof Responses>
    | boolean;
  mediaTypes: boolean | string[];
}

interface IRequestBodyOptions extends ISchemaAddress {
  path: string | RegExp | boolean;
  method: MethodNames | MethodNames[] | boolean;
  mediaTypes: boolean | string[];
}

interface IPathParameterOptions extends ISchemaAddress {
  path: string | RegExp | boolean;
  name: string | boolean;
  in: string | boolean;
}

interface IMethodParameterOptions extends ISchemaAddress {
  path: string | RegExp | boolean;
  method: MethodNames | MethodNames[] | boolean;
  name: string | boolean;
  in: string | boolean;
}

interface IHeaderOptions extends ISchemaAddress {
  path: string | RegExp | boolean;
  method: MethodNames | MethodNames[] | boolean;
  code:
    | CodeAsInt
    | keyof Responses
    | Array<CodeAsInt | keyof Responses>
    | boolean;
  name: string | boolean;
}

type ResponseBodySignature = [
  string | boolean | RegExp,
  boolean | MethodNames | MethodNames[],
  boolean | Array<keyof Responses>,
  boolean | string[]
];

type RequestBodySignature = [
  string | boolean | RegExp,
  boolean | MethodNames | MethodNames[],
  boolean | string[]
];

type PathParameterSignature = [
  string | boolean | RegExp,
  string | boolean,
  string | boolean
];

type MethodParameterSignature = [
  string | RegExp | boolean,
  MethodNames | MethodNames[] | boolean,
  string | boolean,
  string | boolean
];

type HeaderSignature = [
  string | RegExp | boolean,
  MethodNames | MethodNames[] | boolean,
  boolean | Array<keyof Responses>,
  string | boolean
];

type TraversalFunction<T extends ISchemaAddress> = (
  options?: T
) => (o: OpenAPIObject) => Traversal<OpenAPIObject, Schema | Reference>;

const pathParameterSignatureFromOptions = (
  options?: Partial<IPathParameterOptions>
): PathParameterSignature => [
  options && options.path !== undefined ? options.path : true,
  options && options.name !== undefined ? options.name : true,
  options && options.in !== undefined ? options.in : true
];
const methodParameterSignatureFromOptions = (
  options?: Partial<IMethodParameterOptions>
): MethodParameterSignature => [
  options && options.path !== undefined ? options.path : true,
  options && options.method !== undefined ? options.method : true,
  options && options.name !== undefined ? options.name : true,
  options && options.in !== undefined ? options.in : true
];
const headerSignatureFromOptions = (
  options?: Partial<IHeaderOptions>
): HeaderSignature => [
  options && options.path !== undefined ? options.path : true,
  options && options.method !== undefined ? options.method : true,
  options && options.code !== undefined
    ? typeof options.code === "boolean"
      ? options.code
      : (options.code instanceof Array ? options.code : [options.code]).map(
          codeConvert
        )
    : true,
  options && options.name !== undefined ? options.name : true
];
const responseBodySignatureFromOptions = (
  options?: Partial<IResponseBodyOptions>
): ResponseBodySignature => [
  options && options.path !== undefined ? options.path : true,
  options && options.method !== undefined ? options.method : true,
  options && options.code !== undefined
    ? typeof options.code === "boolean"
      ? options.code
      : (options.code instanceof Array ? options.code : [options.code]).map(
          codeConvert
        )
    : true,
  options && options.mediaTypes !== undefined
    ? typeof options.mediaTypes === "string"
      ? [options.mediaTypes]
      : options.mediaTypes
    : true
];

const requestBodySignatureFromOptions = (
  options?: Partial<IRequestBodyOptions>
): RequestBodySignature => [
  options && options.path !== undefined ? options.path : true,
  options && options.method !== undefined ? options.method : true,
  options && options.mediaTypes !== undefined
    ? typeof options.mediaTypes === "string"
      ? [options.mediaTypes]
      : options.mediaTypes
    : true
];

type CurriedTraversal = (
  traversal: (o: OpenAPIObject) => Traversal<OpenAPIObject, Schema | Reference>,
  path: Array<string | number | typeof Arr | typeof Addl>
) => (o: OpenAPIObject) => OpenAPIObject;

const expandCurriedTraversal = <T extends ISchemaAddress>(
  c: CurriedTraversal,
  options?: T
) => (tf: TraversalFunction<T>) => (_: ISerializedRequest, o: OpenAPIObject) =>
  c(tf(options), options && options.lens ? options.lens : [])(o);

const makeSchemaTraversalStructure = <T extends ISchemaAddress>(
  tf: TraversalFunction<T>
) => (options?: T) => ({
  const: (j: JSONValue) =>
    expandCurriedTraversal(changeToConst(j), options)(tf),
  minItems: (i: number) =>
    expandCurriedTraversal(changeMinItems(i), options)(tf),
  maxItems: (i: number) =>
    expandCurriedTraversal(changeMaxItems(i), options)(tf),
  required: (prop: string) =>
    expandCurriedTraversal(changeRequiredStatus(prop), options)(tf),
  enumKeep: (vals: any) =>
    expandCurriedTraversal(changeEnum(vals, true), options)(tf),
  enumReject: (vals: any) =>
    expandCurriedTraversal(changeEnum(vals, false), options)(tf),
  anyOfKeep: (indices: number[]) =>
    expandCurriedTraversal(anyOfKeep(indices), options)(tf),
  anyOfReject: (indices: number[]) =>
    expandCurriedTraversal(anyOfReject(indices), options)(tf),
  oneOfKeep: (indices: number[]) =>
    expandCurriedTraversal(oneOfKeep(indices), options)(tf),
  oneOfReject: (indices: number[]) =>
    expandCurriedTraversal(oneOfReject(indices), options)(tf),
  listToTuple: (i: number) =>
    expandCurriedTraversal(changeListToTuple(i), options)(tf),
  schema: (
    schemaOrFunction: Schema | ((o: OpenAPIObject) => (s: Schema) => Schema)
  ) =>
    expandCurriedTraversal(
      changeSingleSchema(
        typeof schemaOrFunction === "function"
          ? schemaOrFunction
          : (_: OpenAPIObject) => (__: Schema) => schemaOrFunction
      ),
      options
    )(tf)
});

export const transform = {
  compose: (...transformers: IStateTransformer[]) => (
    req: ISerializedRequest,
    o: OpenAPIObject
  ) => transformers.reduce((a, b) => b(req, a), o),
  noopThrows: (f: IStateTransformer) => (
    req: ISerializedRequest,
    o: OpenAPIObject
  ): OpenAPIObject => {
    const out = f(req, o);
    if (isEqual(out, o)) {
      throw Error("Array item setting did not work");
    }
    return out;
  },
  times: (n: number) => (f: IStateTransformer) => {
    const counter = { c: 0 };
    return (req: ISerializedRequest, o: OpenAPIObject): OpenAPIObject => {
      const out = f(req, o);
      if (!isEqual(out, o)) {
        counter.c = counter.c + 1;
      }
      if (counter.c > n) {
        return o;
      }
      return out;
    };
  },
  withCodes,
  withoutCodes,
  responseBody: makeSchemaTraversalStructure<Partial<IResponseBodyOptions>>(
    (options?: Partial<IResponseBodyOptions>) =>
      responseBody(...responseBodySignatureFromOptions(options))
  ),
  requestBody: makeSchemaTraversalStructure<Partial<IRequestBodyOptions>>(
    (options?: Partial<IRequestBodyOptions>) =>
      requestBody(...requestBodySignatureFromOptions(options))
  ),
  pathParameter: makeSchemaTraversalStructure<Partial<IPathParameterOptions>>(
    (options?: Partial<IPathParameterOptions>) =>
      pathParameter(...pathParameterSignatureFromOptions(options))
  ),
  methodParameter: makeSchemaTraversalStructure<
    Partial<IMethodParameterOptions>
  >((options?: Partial<IMethodParameterOptions>) =>
    methodParameter(...methodParameterSignatureFromOptions(options))
  ),
  header: makeSchemaTraversalStructure<Partial<IHeaderOptions>>(
    (options?: Partial<IHeaderOptions>) =>
      header(...headerSignatureFromOptions(options))
  )
};
