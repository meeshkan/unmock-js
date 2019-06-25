/**
 * Implements the logic for generating a response from a service file
 */

import {
  CreateResponse,
  GeneratedMock,
  IMock,
  IResponseCreatorFactoryInput,
  ISerializedRequest,
  RequestToSpec,
} from "./interfaces";
import { httpRequestMatcherFactory } from "./matcher";
import {
  IUnmockServiceState,
  OASSchema,
  UnmockServiceState,
} from "./service/interfaces";

// json-schema-faker doesn't have typed definitions?
// @ts-ignore
import jsf from "json-schema-faker";

export const responseCreatorFactory = (
  opts: IResponseCreatorFactoryInput,
): CreateResponse => {
  const httpRequestMatcher = httpRequestMatcherFactory(opts.mockGenerator);
  return (req: ISerializedRequest) => httpRequestMatcher(req);
};

const getPathSchemaFromSpec = (
  spec: OASSchema,
  method: string,
  path: string,
): OASSchema => {
  // TODO: Smarter path matching (to match path parameters, for example)
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

const templateFromResponse = (response: OASSchema): OASSchema => {
  // Returns the schema nested under content/X, where X is a type
  // (e.g. application/json)
  const keys = Object.keys(response.content);
  if (keys.length === 0) {
    throw new Error( // response.description is the only mandatory field
      `Can't find any content-type for '${response.description}'`,
    );
  }

  return response.content[keys[0]];
};

const setupJSFUnmockProperties = (_: UnmockServiceState) => {
  // TODO: use the state parameter to update values as needed

  jsf.define("unmock-size", (value: number, schema: OASSchema) => {
    delete schema["x-unmock-size"];
    if (schema.type !== "array") {
      return schema; // validate type
    }
    schema.minItems = value;
    schema.maxItems = value;
    return schema;
  });
};

const fetchState = (_: ISerializedRequest): IUnmockServiceState => {
  // TODO: Implement.
  // Will fetch the state of `method` `url` `path` from unmock.
  return { $code: 200 }; // Return 200 code for now
};

const genMockFromSerializedRequest = (getSpecFromRequest: RequestToSpec) => (
  sreq: ISerializedRequest,
): IMock => {
  const { method, path, host } = sreq;
  // 1. Use sreq to find the proper specification and, as needed, convert
  //    from short-hand notation to verbose OAS (Mike)
  const spec = getSpecFromRequest(sreq);
  if (spec === undefined) {
    throw new Error(`Can't find matching service for '${host}'`);
  }
  // 2. Use sreq to fetch the relevant path in the OAS spec
  const pathSchema = getPathSchemaFromSpec(spec, method, path);
  // 3. Fetch state from DSL
  const state = fetchState(sreq);
  // 4. At this point, we assume there are no references, and we only need to
  //    handle x-unmock-* within the schemas, modify it according to these
  //    properties + the state -> we can work with jsf out of the box
  const responseTemplate = templateFromResponse(
    pathSchema.responses[state.$code] ||
      pathSchema.responses.default ||
      pathSchema.responses[Object.keys(pathSchema.responses)[0]],
  );

  // Setup the unmock properties for jsf parsing
  setupJSFUnmockProperties(state);
  // First iteration simply parses these and returns the updated schema
  const resolvedTemplate = jsf.generate(responseTemplate);
  jsf.reset();

  // 5. Generate as needed
  return {
    request: sreq,
    response: {
      body: jsf.generate(resolvedTemplate).schema,
      // TODO: headers
      statusCode: state.$code, // TODO: what if `$code` response doesn't exist?
    },
  };
};

export const mockGeneratorFactory = (
  getSpecFromRequest: RequestToSpec,
): ((sreq: ISerializedRequest) => GeneratedMock) => {
  return genMockFromSerializedRequest(getSpecFromRequest);
};
