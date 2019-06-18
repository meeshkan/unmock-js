/**
 * Implements the logic for generating a response from a service file
 */

import {
  CreateResponse,
  IResponseCreatorFactoryInput,
  ISerializedRequest,
} from "./interfaces";
import { httpRequestMatcherFactory } from "./matcher";

import fs from "fs"; // TODO: remove
// TODO: Change this for json schema faker?
// TODO: json-schema-faker doesn't have @types definition, so instead
// TODO: we parse manually for now -- MVP hurray!
// import faker from "faker";
import yaml from "js-yaml";

export const responseCreatorFactory = (
  opts: IResponseCreatorFactoryInput,
): CreateResponse => {
  const httpRequestMatcher = httpRequestMatcherFactory(opts.mockGenerator);
  return (req: ISerializedRequest) => httpRequestMatcher(req);
};

const getSpecFromRequest = (_: ISerializedRequest): string | undefined => {
  // TODO: Implement!
  return fs.readFileSync(
    "/home/meeshkan-cain/git/unmock-js/packages/unmock-core/src/__tests__/__unmock__/specs/petstore/spec.yaml",
    "utf8",
  );
};

const getPathSchemaFromSpec = (
  spec: any,
  method: string,
  path: string,
): any => {
  if (spec.paths === undefined || spec.paths[path] === undefined) {
    // spec.info.title is mandatory in OAS, we assume `spec` is OAS compliant
    throw new Error(`Can't find path '${path}' for ${spec.info.title}`);
  }
  const pathSchema = spec.paths[path][method];
  if (
    pathSchema === undefined ||
    pathSchema.responses === undefined ||
    Object.keys(pathSchema.responses).length === 0
  ) {
    throw new Error(
      `Can't find response for '${method} ${path}' for ${spec.info.title}`,
    );
  }
  // We return the entire object so we can resolve references
  // to request parameters etc as needed
  return pathSchema;
};

export const genMockFromSerializedRequest = (sreq: ISerializedRequest) => {
  const { method, path, host } = sreq;
  // 1. Use sreq to find the proper specification and, as needed, convert
  //    from short-hand notation to verbose OAS (Mike)
  const specString = getSpecFromRequest(sreq);
  if (specString === undefined) {
    throw new Error(`Can't find matching service for '${host}'`);
  }
  // 2. Use sreq to fetch the relevant path in the OAS spec
  const spec = yaml.load(specString);
  const pathSchema = getPathSchemaFromSpec(spec, method, path);
  // 3. Fetch state from DSL?
  // TODO: Do we use the state method Idan made? 🤔
  // 4. Generate as needed.
  // TODO: For now, we just choose the 'default', '200', or the first available response.
  const responseTemplate =
    pathSchema.responses.default ||
    pathSchema.responses["200"] ||
    pathSchema.responses[Object.keys(pathSchema.responses)[0]];

  // tslint:disable-next-line: no-console
  console.log(responseTemplate);
};
