/**
 * Implements the logic for generating a response from a service file
 */
import { Operation } from "loas3/dist/src/generated/full";
import {
  CreateResponse,
  ISerializedRequest,
  ISerializedResponse,
  IServiceDef,
  IServiceDefLoader,
} from "./interfaces";

import { IService } from "./service/interfaces";

import { Schema, UnmockServiceState } from "./service/interfaces";

// json-schema-faker doesn't have typed definitions?
// @ts-ignore
import jsf from "json-schema-faker";
import { ServiceParser } from "./service/parser";
import { ServiceStore } from "./service/serviceStore";

export function responseCreatorFactory({
  serviceDefLoader,
}: {
  serviceDefLoader: IServiceDefLoader;
}): CreateResponse {
  const serviceDefs: IServiceDef[] = serviceDefLoader.loadSync();
  const parser = new ServiceParser();
  const services: IService[] = serviceDefs.map(serviceDef =>
    parser.parse(serviceDef),
  );
  const serviceStore = new ServiceStore(services);
  return (sreq: ISerializedRequest) =>
    generateMockFromTemplate(serviceStore.match(sreq));
}

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

const generateMockFromTemplate = (
  responseTemplate: Operation | undefined,
): ISerializedResponse | undefined => {
  if (responseTemplate === undefined) {
    return undefined;
  }
  // 1. Take in state from DSL
  // TODO: Link with Matcher/Service
  const state = { $code: 200 };
  // const responseCode = String(state.$code || "default");
  // 2. At this point, we assume there are no references, and we only need to
  //    handle x-unmock-* within the schemas, modify it according to these
  //    properties + the state -> we can work with jsf out of the box

  // Setup the unmock properties for jsf parsing
  setupJSFUnmockProperties(state);
  // First iteration simply parses these and returns the updated schema
  const resolvedTemplate = jsf.generate(responseTemplate);
  jsf.reset();

  // 5. Generate as needed
  return {
    body: jsf.generate(resolvedTemplate).schema,
    // TODO: headers
    statusCode: state.$code, // TODO: what if `$code` response doesn't exist?
  };
};
