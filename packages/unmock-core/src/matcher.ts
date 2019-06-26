import debug from "debug";
import {
  IMock,
  IMockRequest,
  ISerializedRequest,
  ISerializedResponse,
} from "./interfaces";

const debugLog = debug("unmock:matcher");

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

// Just for readability until we have types
type OperationObject = any;
type PathItemObject = any;

export class OASMatcher {
  /**
   * Strip server path prefix from request path, keeping the leading slash.
   * Examples:
   * 1) request URL "/v1/pets" and server URL "/v1" -> return "/pets"
   * 2) request URL "/v1/pets" and server URL "/" -> return "/v1/pets"
   * @param reqPath Request path, for example, "/v1/pets"
   * @param serverPathPrefix Server path prefix, for example, "/v1" or "/""
   * @returns Path without the server path prefix
   */
  public static normalizeRequestPathToServerPath(
    reqPath: string,
    serverPathPrefix: string,
  ) {
    const serverUrlWithoutTrailingSlash = serverPathPrefix.replace(/\/$/, "");
    const regexToRemoveFromReqPath = new RegExp(
      `^${serverUrlWithoutTrailingSlash}`,
    );
    return reqPath.replace(regexToRemoveFromReqPath, "");
  }
  private readonly schema: OASSchema;
  constructor({ schema }: { schema: OASSchema }) {
    this.schema = schema;
  }
  public matchToResponseTemplate(
    sreq: ISerializedRequest,
  ): OperationObject | undefined {
    const { matches, reqPathWithoutServerPrefix } = this.matchesServer(sreq);
    // TODO: If the Servers object is not at the top level
    if (!matches) {
      debugLog(`Could not find a matching server.`);
      return undefined;
    }

    if (reqPathWithoutServerPrefix === undefined) {
      throw new Error("Expected to get a path without the server path prefix");
    }

    debugLog(
      `Matched server, looking for match for ${reqPathWithoutServerPrefix}`,
    );

    const matchingPathItemOrUndef = this.findMatchingPathItem(
      reqPathWithoutServerPrefix,
    );

    if (matchingPathItemOrUndef === undefined) {
      return undefined;
    }

    const requestMethod = sreq.method.toLowerCase();

    debugLog(`Matched path object, looking for match for ${requestMethod}`);

    const matchingPath = matchingPathItemOrUndef;
    return matchingPath[requestMethod] || matchingPath.default;
  }

  private findMatchingPathItem(reqPath: string): PathItemObject | undefined {
    const paths: { [path: string]: any } | undefined = this.schema.paths;

    if (paths === undefined || paths.length === 0) {
      return undefined;
    }

    const directMatch = paths[reqPath];
    if (directMatch !== undefined) {
      debugLog(`Found direct path match for ${reqPath}`);
      return directMatch;
    }

    const definedPaths = Object.keys(paths);
    debugLog(`Searching for match for ${reqPath} for ${definedPaths}`);

    for (const pathItemKey of Object.keys(paths)) {
      const pathItemObject = paths[pathItemKey];
      const pathRegex = pathItemObject[UNMOCK_PATH_REGEX_KW] as RegExp;
      if (pathRegex === undefined) {
        throw new Error("No pathRegex available for path!");
      }
      if (pathRegex.test(reqPath)) {
        return pathItemObject;
      }
    }
    return undefined;
  }

  private matchesServer(
    sreq: ISerializedRequest,
  ): { matches: boolean; reqPathWithoutServerPrefix?: string } {
    const servers: any[] | undefined = this.schema.servers;
    if (servers === undefined || servers.length === 0) {
      debugLog("No servers to match");
      return { matches: false };
    }
    for (const server of servers) {
      const serverUrl = new URL(server.url);
      const protocol = serverUrl.protocol.replace(":", "");

      debugLog(
        // tslint:disable-next-line
        `Testing: ${protocol} vs. ${sreq.protocol}, ${serverUrl.hostname} vs ${sreq.host}, ${sreq.path} vs ${serverUrl.pathname}`,
      );
      if (
        protocol === sreq.protocol &&
        serverUrl.hostname === sreq.host &&
        sreq.path.startsWith(serverUrl.pathname)
      ) {
        const reqPathWithoutServerPrefix = OASMatcher.normalizeRequestPathToServerPath(
          sreq.path,
          serverUrl.pathname,
        );

        return {
          matches: true,
          reqPathWithoutServerPrefix,
        };
      }
    }
    return { matches: false };
  }
}
