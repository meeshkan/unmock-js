/**
 * Implements the logic for generating a response from a service file
 */
import {
  CreateResponse,
  GeneratedMock,
  IMock,
  ISerializedRequest,
  RequestToSpec,
} from "./interfaces";
import { Schema, UnmockServiceState } from "./service/interfaces";

// json-schema-faker doesn't have typed definitions?
// @ts-ignore
import jsf from "json-schema-faker";

export const responseCreatorFactory = (): CreateResponse => {
  return (__: ISerializedRequest) => ({
    body: "Nothing here yet",
    statusCode: 200,
  });
};

const setupJSFUnmockProperties = (_: UnmockServiceState) => {
  // TODO: use the state parameter to update values as needed

  jsf.define("unmock-size", (value: number, schema: Schema) => {
    if (schema.type !== "array") {
      return schema; // validate type
    }
    schema.minItems = value;
    schema.maxItems = value;
    return schema;
  });
};

const genMockFromSerializedRequest = (getSpecFromRequest: RequestToSpec) => (
  sreq: ISerializedRequest,
): IMock => {
  const { host } = sreq;
  // 1. Use sreq to find the proper specification and, as needed, convert
  //    from short-hand notation to verbose OAS (Mike)
  // TODO: Link with matcher
  const spec = getSpecFromRequest(sreq);
  if (spec === undefined) {
    throw new Error(`Can't find matching service for '${host}'`);
  }
  // 2. Use sreq to fetch the relevant path in the OAS spec
  // const operation = getPathSchemaFromSpec(spec, method, path);
  // 3. Fetch state from DSL
  // TODO: Link with Matcher/Service
  const state = { $code: 200 };
  // const responseCode = String(state.$code || "default");
  // 4. At this point, we assume there are no references, and we only need to
  //    handle x-unmock-* within the schemas, modify it according to these
  //    properties + the state -> we can work with jsf out of the box
  // TODO: link with Matcher
  const responseTemplate = {};

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
