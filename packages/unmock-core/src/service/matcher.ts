import debug from "debug";
import XRegExp from "xregexp";
import { ISerializedRequest } from "../interfaces";
import {
  IEndpointToRegexMapping,
  IOASMatcher,
  MatcherResponse,
  OpenAPIObject,
  PathItem,
} from "./interfaces";
import {
  buildPathRegexStringFromParameters,
  getPathParametersFromPath,
  getPathParametersFromSchema,
} from "./util";

const debugLog = debug("unmock:matcher");

// Just for readability until we have types

export class OASMatcher implements IOASMatcher {
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

  private static buildRegexpForPaths(
    schema: OpenAPIObject,
  ): IEndpointToRegexMapping {
    const mapping: IEndpointToRegexMapping = {};
    const paths: { [path: string]: any } | undefined = schema.paths;
    if (paths === undefined || paths.length === 0) {
      return mapping;
    }
    Object.keys(paths).forEach((path: string) => {
      const pathParameters = getPathParametersFromPath(path);
      let newPath: string = "";
      if (pathParameters.length === 0) {
        newPath = path; // Simply convert to direct regexp pattern
      } else {
        const schemaParameters = getPathParametersFromSchema(paths, path);
        newPath = buildPathRegexStringFromParameters(
          path,
          schemaParameters,
          pathParameters,
        );
      }

      const newPathRegex = XRegExp(`^${newPath}$`, "g");
      mapping[path] = newPathRegex;
    });
    return mapping;
  }

  private readonly schema: OpenAPIObject;
  private readonly endpointToRegexMapping: IEndpointToRegexMapping = {};

  constructor({ schema }: { schema: OpenAPIObject }) {
    this.schema = schema;
    this.endpointToRegexMapping = OASMatcher.buildRegexpForPaths(this.schema);
  }

  public matchToOperationObject(sreq: ISerializedRequest): MatcherResponse {
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
    return (matchingPath as any)[requestMethod];
  }

  public findEndpoint(reqPath: string): string | undefined {
    /**
     * Finds the endpoint key that matches given endpoint string
     * First attempts a direct match by dictionary look-up
     * If it fails, iterates over all endpoint until a match is found.
     * Matching path key is returned so that future matching, reference, etc can be done as needed.
     */
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
      const pathRegex = this.endpointToRegexMapping[pathItemKey];
      if (pathRegex === undefined) {
        continue;
      }
      if (pathRegex.test(reqPath)) {
        return pathItemKey;
      }
    }
    return undefined;
  }

  private findMatchingPathItem(reqPath: string): PathItem | undefined {
    const pathItemKey = this.findEndpoint(reqPath);
    return pathItemKey !== undefined
      ? this.schema.paths[pathItemKey]
      : undefined;
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
        `Testing: ${protocol} vs. ${sreq.protocol}, ${serverUrl.hostname} ` +
          `vs ${sreq.host}, ${sreq.path} vs ${serverUrl.pathname}`,
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
