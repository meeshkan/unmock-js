import debug from "debug";
import url from "url";
import XRegExp from "xregexp";
import { ISerializedRequest } from "../interfaces";
import { OASMethodKey, OpenAPIObject, PathItem } from "./interfaces";
import {
  buildPathRegexStringFromParameters,
  getPathParametersFromPath,
  getPathParametersFromSchema,
} from "./util";

const debugLog = debug("unmock:matcher");

interface IEndpointToRegexMapping {
  [endpoint: string]: RegExp;
}

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
    const pathSuffix = serverPathPrefix.endsWith("/") ? "" : "/";
    const serverPathRegex = new RegExp(`^${serverPathPrefix + pathSuffix}`);
    return reqPath.replace(serverPathRegex, "/");
  }

  private static buildRegexpForPaths(
    schema: OpenAPIObject,
  ): IEndpointToRegexMapping {
    const mapping: IEndpointToRegexMapping = {};
    const paths = schema.paths;
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

      const newPathRegex = XRegExp(`^${newPath}$`, "gi");
      mapping[path] = newPathRegex;
    });
    return mapping;
  }

  private readonly schema: OpenAPIObject;
  private readonly endpointToRegexMapping: IEndpointToRegexMapping;

  constructor({ schema }: { schema: OpenAPIObject }) {
    this.schema = schema;
    this.endpointToRegexMapping = OASMatcher.buildRegexpForPaths(this.schema);
  }

  public matchToOperationObject(sreq: ISerializedRequest) {
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
    return matchingPath[requestMethod as OASMethodKey];
  }

  public findEndpoint(
    reqPath: string,
  ): { schemaEndpoint: string; normalizedEndpoint: string } | undefined {
    /**
     * Finds the endpoint key that matches given endpoint string
     * First attempts a direct match by dictionary look-up
     * If it fails, iterates over all endpoint until a match is found.
     * Matching path key is returned so that future matching, reference, etc can be done as needed.
     */
    const paths = this.schema.paths;
    if (paths === undefined || paths.length === 0) {
      return undefined;
    }

    // Remove server base address
    const servers: any[] | undefined = this.schema.servers;
    if (servers !== undefined && servers.length > 0) {
      // Try and normalize the requested path...
      for (const server of servers) {
        const serverUrl = url.parse(server.url);
        if (serverUrl.pathname === undefined) {
          throw Error("Got undefined pathname");
        }
        if (reqPath.startsWith(serverUrl.pathname)) {
          reqPath = OASMatcher.normalizeRequestPathToServerPath(
            reqPath,
            serverUrl.pathname,
          );
          break;
        }
      }
    }
    const directMatch = paths[reqPath];
    if (directMatch !== undefined) {
      debugLog(`Found direct path match for ${reqPath}`);
      return { schemaEndpoint: reqPath, normalizedEndpoint: reqPath };
    }

    const definedPaths = Object.keys(paths);
    debugLog(`Searching for match for ${reqPath} for ${definedPaths}`);

    for (const pathItemKey of Object.keys(paths)) {
      const pathRegex = this.endpointToRegexMapping[pathItemKey];
      if (XRegExp.test(reqPath, pathRegex)) {
        return { schemaEndpoint: pathItemKey, normalizedEndpoint: reqPath };
      }
    }
    return undefined;
  }

  private findMatchingPathItem(reqPath: string): PathItem | undefined {
    const maybePathItemKey = this.findEndpoint(reqPath);
    return maybePathItemKey !== undefined
      ? this.schema.paths[maybePathItemKey.schemaEndpoint]
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
      const serverUrl = url.parse(server.url);
      if (serverUrl === undefined) {
        continue;
      }
      if (serverUrl.protocol === undefined || !(/^https?:$/.test(serverUrl.protocol))) {
        throw new Error(`Unknown protocol: ${serverUrl.protocol}`);
      }
      const protocol = serverUrl.protocol.replace(":", "");

      debugLog(
        `Testing: ${protocol} vs. ${sreq.protocol}, ${serverUrl.hostname} ` +
          `vs ${sreq.host}, ${sreq.path} vs ${serverUrl.pathname}`,
      );
      if (serverUrl.pathname === undefined) {
        throw new Error("Got undefined pathname");
      }
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
