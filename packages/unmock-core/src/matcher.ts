import {
  IMock,
  IMockRequest,
  ISerializedRequest,
  ISerializedResponse,
} from "./interfaces";

import { UNMOCK_PATH_REGEX_KW } from "./service/constants";

import { OASSchema } from "./service/interfaces";

type RequestComparator = (
  intercepted: ISerializedRequest,
  mock: IMockRequest,
) => boolean;

/**
 * Compare properties in intercepted request and the stored mock request.
 * An empty property in mock request is considered a match.
 * @param input
 */
function propertyMatches({
  property,
  interceptedRequest,
  mockRequest,
}: {
  property: keyof (ISerializedRequest & IMockRequest);
  interceptedRequest: ISerializedRequest;
  mockRequest: IMockRequest;
}): boolean {
  const mockRequestProperty = mockRequest[property];
  const interceptedRequestProperty = interceptedRequest[property];

  if (mockRequestProperty === undefined) {
    return true;
  }

  if (
    mockRequestProperty instanceof RegExp &&
    typeof interceptedRequestProperty === "string"
  ) {
    return mockRequestProperty.test(interceptedRequestProperty);
  }

  return mockRequestProperty === interceptedRequestProperty;
}

const requestsMatch: RequestComparator = (
  interceptedRequest,
  mockRequest,
): boolean => {
  return (
    propertyMatches({
      interceptedRequest,
      mockRequest,
      property: "protocol",
    }) &&
    propertyMatches({ property: "host", interceptedRequest, mockRequest }) &&
    propertyMatches({ property: "path", interceptedRequest, mockRequest }) &&
    propertyMatches({ property: "method", interceptedRequest, mockRequest })
  );
};

type HttpRequestMatcher = (
  request: ISerializedRequest,
) => ISerializedResponse | undefined;

type HttpRequestMatcherFactory = (
  mockIterable: () => Iterable<IMock>,
) => HttpRequestMatcher;

/**
 * Build request matcher from mock iterable factory
 * @param mockIterable Factory of iterable producing mocks to match
 * @returns HttpRequestMatcher
 */
export const httpRequestMatcherFactory: HttpRequestMatcherFactory = (
  mockIterable: () => Iterable<IMock>,
) => (request: ISerializedRequest) => {
  for (const mock of mockIterable()) {
    if (requestsMatch(request, mock.request)) {
      return mock.response;
    }
  }
  return undefined;
};

export class OASMatcher {
  private readonly schema: OASSchema;
  constructor({ schema }: { schema: OASSchema }) {
    this.schema = schema;
  }
  public matchToResponseTemplate(sreq: ISerializedRequest): any | undefined {
    if (!this.matchesServer(sreq)) {
      return undefined;
    }

    const matchingPathOrNone = this.matchingPath(sreq.path);

    if (matchingPathOrNone === undefined) {
      return undefined;
    }

    const matchingPath = matchingPathOrNone;

    return matchingPath[sreq.method] || undefined;
  }

  private matchingPath(reqPath: string): any | undefined {
    const paths: { [path: string]: any } | undefined = this.schema.paths;

    if (paths === undefined || paths.length === 0) {
      return undefined;
    }

    const directMatch = paths[reqPath];
    if (directMatch !== undefined) {
      return directMatch;
    }
    for (const pathObject of Object.keys(paths)) {
      const pathRegex = paths[pathObject][UNMOCK_PATH_REGEX_KW] as RegExp;
      if (pathRegex === undefined) {
        throw new Error("No pathRegex available for path!");
      }
      if (pathRegex.test(reqPath)) {
        return pathObject;
      }
    }
    return undefined;
  }

  private matchesServer(sreq: ISerializedRequest): boolean {
    const servers: string[] | undefined = this.schema.servers;
    if (servers === undefined || servers.length === 0) {
      return false;
    }
    for (const server of servers) {
      const serverUrl = new URL(server);
      const protocol = serverUrl.protocol;
      if (
        protocol === sreq.protocol &&
        serverUrl.hostname === sreq.host &&
        sreq.path.startsWith(serverUrl.pathname)
      ) {
        return true;
      }
    }
    return false;
  }
}
