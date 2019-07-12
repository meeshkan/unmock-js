/**
 * Implements the logic for generating a response from a service file
 */
// @ts-ignore // json-schema-faker doesn't have typed definitions?
import jsf from "json-schema-faker";
import { defaultsDeep } from "lodash";
import {
  CreateResponse,
  ISerializedRequest,
  ISerializedResponse,
  IServiceDef,
  IServiceDefLoader,
} from "./interfaces";
import { stateStoreFactory } from "./service";
import {
  codeToMedia,
  IService,
  isReference,
  MatcherResponse,
  Operation,
  Responses,
  Schema,
} from "./service/interfaces";
import { ServiceParser } from "./service/parser";
import { ServiceStore } from "./service/serviceStore";

function firstOrRandomOrUndefined<T>(arr: T[]): T | undefined {
  return arr.length === 0
    ? undefined
    : arr.length === 1
    ? arr[0]
    : arr[Math.floor(Math.random() * arr.length)];
}

export function responseCreatorFactory({
  serviceDefLoader,
}: {
  serviceDefLoader: IServiceDefLoader;
}): { stateStore: any; createResponse: CreateResponse } {
  const serviceDefs: IServiceDef[] = serviceDefLoader.loadSync();
  const parser = new ServiceParser();
  const services: IService[] = serviceDefs.map(serviceDef =>
    parser.parse(serviceDef),
  );
  const serviceStore = new ServiceStore(services);
  const stateStore = stateStoreFactory(serviceStore);
  return {
    stateStore,
    createResponse: (sreq: ISerializedRequest) =>
      generateMockFromTemplate(serviceStore.match(sreq)),
  };
}

const setupJSFUnmockProperties = () => {
  // Handle post-generation references, etc?
};

const getStateForOperation = (
  operation: Operation,
  state: codeToMedia | undefined,
): { $code: string; template: Schema } | undefined => {
  const responses = operation.responses;
  const operationCodes = Object.keys(responses);
  if (state === undefined || Object.keys(state).length === 0) {
    return undefined;
  }
  const possibleResponseCodes = Object.keys(state).filter((code: string) =>
    operationCodes.includes(code),
  );
  // if only one response code is set - use that one; otherwise draw at random
  // TODO - do we want to set sensible defaults?
  const statusCode = firstOrRandomOrUndefined(possibleResponseCodes);
  if (statusCode === undefined) {
    return undefined;
  }

  const operationResponse = responses[statusCode as keyof Responses];
  if (
    operationResponse === undefined ||
    isReference(operationResponse) ||
    operationResponse.content === undefined
  ) {
    return undefined;
  }
  const operationContent = operationResponse.content;

  const mediaTypes = Object.keys(state[statusCode]).filter((type: string) =>
    Object.keys(operationContent).includes(type),
  );
  const mediaType = firstOrRandomOrUndefined(mediaTypes); // Ditto
  if (mediaType === undefined) {
    return undefined;
  }

  // Filter the state so it matches the schema
  const requestedState = state[statusCode][mediaType];
  const matchedOperation = operationContent[mediaType].schema;
  return {
    $code: statusCode,
    template: defaultsDeep(requestedState, matchedOperation),
  };
};

const chooseResponseFromOperation = (
  operation: Operation,
): { $code: string; template: Schema } => {
  const responses = operation.responses;
  const chosenCode = firstOrRandomOrUndefined(Object.keys(responses));
  if (chosenCode === undefined) {
    throw new Error("Not sure what went wrong");
  }

  const response = responses[chosenCode as keyof Responses];
  if (
    response === undefined ||
    isReference(response) ||
    response.content === undefined
  ) {
    throw new Error("Not sure what went wrong");
  }

  const content = response.content;
  const chosenMediaType = firstOrRandomOrUndefined(Object.keys(content));
  if (chosenMediaType === undefined) {
    throw new Error("Not sure what went wrong");
  }
  const schema = content[chosenMediaType].schema;
  if (schema === undefined || isReference(schema)) {
    throw new Error("Missing schema for a response!"); // Or do we want to simply choose another response?
  }

  return { $code: chosenCode, template: schema };
};

const generateMockFromTemplate = (
  matchedService: MatcherResponse,
): ISerializedResponse | undefined => {
  if (matchedService === undefined) {
    return undefined;
  }
  const { operation, state } = matchedService;
  const { template, $code } =
    getStateForOperation(operation, state) ||
    chooseResponseFromOperation(operation);

  // At this point, we assume there are no references, and we only need to
  // handle x-unmock-* within the schemas, modify it according to these
  // properties + the state -> we can work with jsf out of the box

  // Setup the unmock properties for jsf parsing
  setupJSFUnmockProperties();
  // First iteration simply parses these and returns the updated schema
  const resolvedTemplate = jsf.generate(template);
  jsf.reset();
  // After one-pass resolving we might have new parameters to resolve.
  let body: string;
  try {
    body = JSON.stringify(jsf.generate(resolvedTemplate));
  } catch {
    body = JSON.stringify(resolvedTemplate);
  }

  // 5. Generate as needed
  return {
    body,
    // TODO: headers
    statusCode: +$code || 200,
  };
};
