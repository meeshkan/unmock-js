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
import yaml from "js-yaml";
// json-schema-faker doesn't have typed definitions?
// @ts-ignore
import jsf from "json-schema-faker";

export const responseCreatorFactory = (
  opts: IResponseCreatorFactoryInput,
): CreateResponse => {
  const httpRequestMatcher = httpRequestMatcherFactory(opts.mockGenerator);
  return (req: ISerializedRequest) => httpRequestMatcher(req);
};

const getSpecFromRequest = (_: ISerializedRequest): any => {
  // TODO: Implement!
  return yaml.load(
    fs.readFileSync(
      "/home/meeshkan-cain/git/unmock-js/packages/unmock-core/src/__tests__/__unmock__/specs/petstore/spec_parsed.yaml",
      "utf8",
    ),
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

const templateFromResponse = (response: any): any => {
  const keys = Object.keys(response.content);
  if (keys.length === 0) {
    throw new Error( // response.description is the only mandatory field
      `Can't find any content-type for '${response.description}'`,
    );
  }

  return response.content[keys[0]];
};

export const genMockFromSerializedRequest = (sreq: ISerializedRequest) => {
  const { method, path, host } = sreq;
  // 1. Use sreq to find the proper specification and, as needed, convert
  //    from short-hand notation to verbose OAS (Mike)
  const spec = getSpecFromRequest(sreq);
  if (spec === undefined) {
    throw new Error(`Can't find matching service for '${host}'`);
  }
  // 2. Use sreq to fetch the relevant path in the OAS spec
  //    At this point, we assume there are no references, and we only need to
  //    generate content based on either `type` or `x-unmock-X` instructions
  const pathSchema = getPathSchemaFromSpec(spec, method, path);
  // 3. Fetch state from DSL?
  // TODO: Do we use the state method Idan made? 🤔
  //
  // 4. Use the state + x-unmock-X tags to modify the content, so we can work
  //    with jsf out of the box
  // TODO: For now, we just choose '200', default', or the first available response.
  const responseTemplate = templateFromResponse(
    pathSchema.responses["200"] ||
      pathSchema.responses.default ||
      pathSchema.responses[Object.keys(pathSchema.responses)[0]],
  );

  jsf.define("unmock-size", (value: number, schema: any) => {
    delete schema["x-unmock-size"];
    if (schema.type !== "array") {
      return schema; // validate type
    }
    schema.minItems = value;
    schema.maxItems = value;
    return schema;
  });

  const resolvedTemplate = jsf.generate(responseTemplate);

  jsf.reset();

  // 5. Generate as needed
  console.log(jsf.generate(resolvedTemplate));
};
