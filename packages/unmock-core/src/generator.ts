/**
 * Implements the logic for generating a response from a service file
 */
// Try fixing broken imports in Node <= 8 by using require instead of default import
const jsf = require("json-schema-faker"); // tslint:disable-line:no-var-requires
import { defaultsDeep } from "lodash";
import {
  CreateResponse,
  IListener,
  ISerializedRequest,
  ISerializedResponse,
  IServiceDef,
  IServiceDefLoader,
  IUnmockOptions,
} from "./interfaces";
import {
  codeToMedia,
  Dereferencer,
  Header,
  IServiceCore,
  MatcherResponse,
  Operation,
  Response,
  Responses,
  Schema,
  ServiceStoreType,
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
  listeners = [],
  options,
}: {
  serviceDefLoader: IServiceDefLoader;
  listeners?: IListener[];
  options: IUnmockOptions;
}): { services: ServiceStoreType; createResponse: CreateResponse } {
  const serviceDefs: IServiceDef[] = serviceDefLoader.loadSync();
  const coreServices: IServiceCore[] = serviceDefs.map(serviceDef =>
    ServiceParser.parse(serviceDef),
  );

  const match = (sreq: ISerializedRequest) =>
    coreServices
      .map(service => service.match(sreq))
      .filter(res => res !== undefined)
      .shift();
  const services = ServiceStore(coreServices);

  return {
    services,
    createResponse: (req: ISerializedRequest) => {
      // Setup the unmock properties for jsf parsing of x-unmock-*
      setupJSFUnmockProperties(req);
      const matcherResponse: MatcherResponse = match(req);

      const res = generateMockFromTemplate(options, matcherResponse);

      // Notify call tracker
      if (
        typeof matcherResponse !== "undefined" &&
        typeof res !== "undefined"
      ) {
        matcherResponse.service.track({ req, res });
      }

      listeners.forEach((listener: IListener) => listener.notify({ req, res }));
      jsf.reset(); // removes unmock-properties
      return res;
    },
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

const toJSONSchemaType = (input: any) =>
  Array.isArray(input)
    ? "array"
    : input === null || input === undefined
    ? "null"
    : typeof input;

const setupJSFUnmockProperties = (sreq: ISerializedRequest) => {
  // Handle post-generation references, etc
  jsf.define(
    "unmock-function",
    (fn: (req: ISerializedRequest) => any, schema: any) => {
      const res = fn(sreq);
      // Override the type/format specifications
      delete schema.format;
      schema.type = toJSONSchemaType(res);
      return res;
    },
  );
};

const chooseResponseCode = (codes: string[]) => {
  if (codes.length === 1) {
    return codes[0];
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
  const stateCodes = Object.keys(state);
  const possibleResponseCodes = stateCodes.filter((code: string) =>
    operationCodes.includes(code),
  );

  let operationStatusCode: string | string[] | undefined;
  let stateStatusCode: string | string[] | undefined;
  if (possibleResponseCodes.length === 0) {
    if (operationCodes.indexOf("default") === -1) {
      // No 1-to-1 correspondence and no default to substitute -> can't use this state
      return undefined;
    }
    operationStatusCode = "default";
    stateStatusCode = genOptions.isFlaky
      ? firstOrRandomOrUndefined(stateCodes)
      : chooseResponseCode(stateCodes);
  } else {
    stateStatusCode = operationStatusCode = genOptions.isFlaky
      ? firstOrRandomOrUndefined(possibleResponseCodes)
      : chooseResponseCode(possibleResponseCodes);
  }

  if (operationStatusCode === undefined || stateStatusCode === undefined) {
    // We get here if there are no 2XX responses, but there is still more than 1 possible response code
    throw new Error(
      `Too many matching response codes to choose from in '${operation.description}'!\n` +
        `Try flaky mode (\`unmock.flaky()\`) or explictly set a status code (\`{ $code: N }\`)`,
    );
  } else if (
    Array.isArray(operationStatusCode) ||
    Array.isArray(stateStatusCode)
  ) {
    throw new Error(
      `Too many 2XX responses to choose from in '${operation.description}'!\n` +
        `Try flaky mode (\`unmock.flaky()\`) or explictly set a status code (\`{ $code: N }\`)`,
    );
  }

  const operationResponse = responses[operationStatusCode as keyof Responses];
  if (operationResponse === undefined) {
    return undefined;
  }
  const resolvedResponse = deref<Response>(operationResponse);
  const operationContent = resolvedResponse.content;
  if (operationContent === undefined) {
    return undefined;
  }
  const operationContentKeys = Object.keys(operationContent);

  const mediaTypes = Object.keys(state[stateStatusCode]).filter(
    (type: string) => operationContentKeys.includes(type),
  );
  // if only one media type is set - use that one; otherwise draw at random
  // TODO - do we want to set sensible defaults?
  const mediaType = firstOrRandomOrUndefined(mediaTypes);
  if (mediaType === undefined) {
    return undefined;
  }

  // Filter the state so it matches the schema
  const requestedState = state[stateStatusCode][mediaType];
  const matchedOperation = operationContent[mediaType].schema;
  return {
    $code: stateStatusCode,
    template: defaultsDeep(requestedState, matchedOperation),
    headers: deref<Record<string, Header>>(resolvedResponse.headers),
  };
};

const chooseResponseFromOperation = (
  operation: Operation,
  deref: Dereferencer,
  genOptions: { isFlaky: boolean },
): {
  $code: string;
  template: Schema | undefined;
  headers: Headers | undefined;
} => {
  const responses = operation.responses;
  const codes = Object.keys(responses);
  const chosenCode = genOptions.isFlaky
    ? firstOrRandomOrUndefined(codes)
    : chooseResponseCode(codes);
  if (chosenCode === undefined) {
    if (genOptions.isFlaky) {
      throw new Error(
        `Could not find any responses in operation '${operation.description}'`,
      );
    } else {
      throw new Error(`No valid 2XX responses in '${operation.description}'`);
    }
  } else if (Array.isArray(chosenCode)) {
    throw new Error(
      `Too many 2XX responses to choose from in '${operation.description}'!\n` +
        `Try flaky mode (\`unmock.flaky()\`) or explictly set a status code (\`{ $code: N }\`)`,
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
    return {
      $code: chosenCode,
      template: undefined,
      headers: deref(deRefedResponse.headers),
    };
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

  // Always generate all fields for now
  jsf.option("alwaysFakeOptionals", true);
  jsf.option("useDefaultValue", false);
  const resolvedTemplate = jsf.generate(template);

  const body = resolvedTemplate;
  jsf.option("useDefaultValue", true);
  const resHeaders = jsf.generate(normalizeHeaders(headers));
  jsf.option("useDefaultValue", false);

  return {
    body,
    headers: resHeaders,
    statusCode: +$code || 200,
  };
};
