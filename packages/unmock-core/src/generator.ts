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
  IUnmockOptions,
} from "./interfaces";
import { stateFacadeFactory } from "./service";
import {
  codeToMedia,
  Dereferencer,
  Header,
  IService,
  MatcherResponse,
  Operation,
  Response,
  Responses,
  Schema,
  StateFacadeType,
} from "./service/interfaces";
import { ServiceParser } from "./service/parser";
import { ServiceStore } from "./service/serviceStore";

type Headers = Record<string, Header>;

function firstOrRandomOrUndefined<T>(arr: T[]): T | undefined {
  return arr.length === 0
    ? undefined
    : arr.length === 1
    ? arr[0]
    : arr[Math.floor(Math.random() * arr.length)];
}

export function responseCreatorFactory({
  serviceDefLoader,
  options,
}: {
  serviceDefLoader: IServiceDefLoader;
  options: IUnmockOptions;
}): { stateStore: StateFacadeType; createResponse: CreateResponse } {
  const serviceDefs: IServiceDef[] = serviceDefLoader.loadSync();
  const parser = new ServiceParser();
  const services: IService[] = serviceDefs.map(serviceDef =>
    parser.parse(serviceDef),
  );
  const serviceStore = new ServiceStore(services);
  const stateStore = stateFacadeFactory(serviceStore);
  return {
    stateStore,
    createResponse: (sreq: ISerializedRequest) =>
      generateMockFromTemplate(options, serviceStore.match(sreq)),
  };
}

const normalizeHeaders = (headers: Headers | undefined): Headers | undefined =>
  // Removes the 'schema' from each headers so it can generate a proper response
  headers === undefined
    ? undefined
    : Object.keys(headers).reduce(
        (acc: Headers, h: string) => ({ ...acc, [h]: headers[h].schema }),
        {},
      );

const setupJSFUnmockProperties = () => {
  // Handle post-generation references, etc?
};

const getStateForOperation = (
  operation: Operation,
  state: codeToMedia | undefined,
  deref: Dereferencer,
  genOptions: { isFlaky: boolean },
):
  | {
      $code: string;
      template: Schema;
      headers: Headers | undefined;
    }
  | undefined => {
  const responses = operation.responses;
  const operationCodes = Object.keys(responses);
  if (state === undefined || Object.keys(state).length === 0) {
    return undefined;
  }
  const possibleResponseCodes = Object.keys(state).filter((code: string) =>
    operationCodes.includes(code),
  );

  const statusCode = chooseResponseCode(
    possibleResponseCodes,
    genOptions.isFlaky,
  );
  if (statusCode === undefined) {
    return undefined;
  } else if (Array.isArray(statusCode)) {
    throw new Error(
      `Too many 2XX responses to choose from in '${operation.description}'!\nTry flaky mode or set a status code`,
    );
  }

  const operationResponse = responses[statusCode as keyof Responses];
  if (operationResponse === undefined) {
    return undefined;
  }
  const resolvedResponse = deref<Response>(operationResponse);
  const operationContent = resolvedResponse.content;
  if (operationContent === undefined) {
    return undefined;
  }
  const operationContentKeys = Object.keys(operationContent);

  const mediaTypes = Object.keys(state[statusCode]).filter((type: string) =>
    operationContentKeys.includes(type),
  );
  // if only one media type is set - use that one; otherwise draw at random
  // TODO - do we want to set sensible defaults?
  const mediaType = firstOrRandomOrUndefined(mediaTypes);
  if (mediaType === undefined) {
    return undefined;
  }

  // Filter the state so it matches the schema
  const requestedState = state[statusCode][mediaType];
  const matchedOperation = operationContent[mediaType].schema;
  return {
    $code: statusCode,
    template: defaultsDeep(requestedState, matchedOperation),
    headers: deref<Record<string, Header>>(resolvedResponse.headers),
  };
};

/**
 * Provides a work-around with for functions that may fail with a default value.
 * Attemps to return `f(value)`. If an error is thrown, returns `value`.
 * @param value
 * @param f
 */
const tryCatch = (value: any, f: (value: any) => any) => {
  try {
    return f(value);
  } catch {
    return value;
  }
};

const chooseResponseCode = (codes: string[], isFlaky: boolean) => {
  if (isFlaky) {
    return firstOrRandomOrUndefined(codes);
  }
  if (codes.indexOf("default") > -1) {
    return "default";
  }
  const validCodes = codes.filter(
    // tslint:disable-next-line: radix
    (cd: string) => parseInt(cd) > 199 && parseInt(cd) < 300,
  );
  if (validCodes.length > 1) {
    return validCodes;
  }
  return validCodes[0];
};

const chooseResponseFromOperation = (
  operation: Operation,
  deref: Dereferencer,
  genOptions: { isFlaky: boolean },
): {
  $code: string;
  template: Schema;
  headers: Headers | undefined;
} => {
  const responses = operation.responses;
  const codes = Object.keys(responses);
  const chosenCode = chooseResponseCode(codes, genOptions.isFlaky);
  if (chosenCode === undefined) {
    if (genOptions.isFlaky) {
      throw new Error(
        `Could not find any responses in operation '${operation.description}'`,
      );
    } else {
      throw new Error(
        `No valid default/2XX responses in '${operation.description}'`,
      );
    }
  } else if (Array.isArray(chosenCode)) {
    throw new Error(
      `Too many 2XX responses to choose from in '${operation.description}'!\nTry flaky mode or set a status code`,
    );
  }

  const response = responses[chosenCode as keyof Responses];
  if (response === undefined) {
    // type-checking only, we'll never end up here as chosenCode is a key of responses
    // each of which must have a valid Response | Reference
    throw new Error(
      `Could not load response for status code '${chosenCode}' in '${operation.description}'`,
    );
  }

  const deRefedResponse: Response = deref(response);

  const content = deRefedResponse.content;
  if (content === undefined) {
    throw new Error(
      `Chosen response (${JSON.stringify(content)}) does not have any content!`,
    );
  }

  const chosenMediaType = firstOrRandomOrUndefined(Object.keys(content));
  if (chosenMediaType === undefined) {
    throw new Error(
      `Chosen response (${JSON.stringify(content)}) does not have any content!`,
    );
  }

  const schema = content[chosenMediaType].schema;
  if (schema === undefined) {
    throw new Error("Missing schema for a response!"); // Or do we want to simply choose another response?
  }

  return {
    $code: chosenCode,
    template: deref(schema),
    headers: deref(deRefedResponse.headers),
  };
};

const generateMockFromTemplate = (
  options: IUnmockOptions,
  matchedService: MatcherResponse,
): ISerializedResponse | undefined => {
  if (matchedService === undefined) {
    return undefined;
  }
  const { operation, state, service } = matchedService;
  const { template, $code, headers } =
    getStateForOperation(operation, state, service.dereferencer, {
      isFlaky: options.flaky(),
    }) ||
    chooseResponseFromOperation(operation, service.dereferencer, {
      isFlaky: options.flaky(),
    });

  // At this point, we assume there are no references, and we only need to
  // handle x-unmock-* within the schemas, modify it according to these
  // properties + the state -> we can work with jsf out of the box

  // Setup the unmock properties for jsf parsing
  setupJSFUnmockProperties();
  // Always generate all fields for now
  jsf.option("alwaysFakeOptionals", true);
  // First iteration simply parses these and returns the updated schema
  jsf.option("useDefaultValue", false);
  const resolvedTemplate = jsf.generate(template);
  jsf.reset();

  // After one-pass resolving we might have new parameters to resolve.
  const body = JSON.stringify(tryCatch(resolvedTemplate, jsf.generate));
  jsf.option("useDefaultValue", true);
  const resHeaders = jsf.generate(normalizeHeaders(headers));
  jsf.option("useDefaultValue", false);

  return {
    body,
    headers: resHeaders,
    statusCode: +$code || 200,
  };
};
