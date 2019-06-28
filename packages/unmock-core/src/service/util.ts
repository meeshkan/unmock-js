import XRegExp from "xregexp";
import { OAS_PATH_PARAM_REGEXP, OAS_PATH_PARAMS_KW } from "./constants";
import {
  MediaType,
  Operation,
  Parameter,
  Paths,
  Response,
  Schema,
  UnmockServiceState,
} from "./interfaces";

export const getPathParametersFromPath = (path: string): string[] => {
  const pathParameters: string[] = [];
  XRegExp.forEach(path, OAS_PATH_PARAM_REGEXP, (matchArr: RegExpExecArray) => {
    pathParameters.push(matchArr[1]);
  });
  return pathParameters;
};

export const getPathParametersFromSchema = (
  schema: Paths,
  path: string,
): Parameter[] => {
  if (!path.includes("{") || schema[path] === undefined) {
    // No parameters in this path... Why bother looking?
    return [];
  }
  const schemaPathParameters = getAtLevel(
    schema[path],
    2,
    (_: string, v: any) => v.in === OAS_PATH_PARAMS_KW,
  ) as Parameter[];
  if (
    schemaPathParameters.length === 0 ||
    Object.keys(schemaPathParameters[0]).length === 0
  ) {
    throw new Error(
      `Found a dynamic path '${path}' but no description for path parameters!`,
    );
  }
  return schemaPathParameters;
};

export const buildPathRegexStringFromParameters = (
  path: string,
  schemaParameters: Parameter[],
  pathParameters: string[],
): string => {
  if (schemaParameters.length === 0) {
    return path;
  }

  let newPath = `${path}`;
  // Assumption: All methods describe the parameter the same way.
  Object.values(schemaParameters).forEach((p: any) => {
    const paramLoc = pathParameters.indexOf(p.name);
    if (paramLoc !== -1) {
      // replace the original path with regex as needed
      // for now, we ignore the schema.type and use a generic pattern
      // the pattern is named for later retrieval
      newPath = newPath.replace(`{${p.name}}`, `(?<${p.name}>[^/]+)`);
      pathParameters.splice(paramLoc, 1); // remove from pathParameters after matching
    }
  });
  if (pathParameters.length > 0) {
    // not all elements have been replaced!
    throw new Error(
      `Found a dynamic path '${path}' but the following path ` +
        `parameters have not been described: ${pathParameters}!`,
    );
  }
  return newPath;
};

const DFSVerifyNoneAreUndefined = (obj: any, prevPath: string[] = []) => {
  return Object.keys(obj).forEach((key: string) => {
    const paramPath = prevPath.concat([key]);
    if (obj[key] === undefined) {
      throw new Error(`Can't find definition for ${paramPath.join(".")}`);
    }
    if (typeof obj === "object") {
      DFSVerifyNoneAreUndefined(obj[key], paramPath);
    }
  });
};

export const verifyResponseWithState = (
  content: MediaType,
  state: UnmockServiceState,
) => {
  // Employ DFS to iterate over state and see if it matches in response...
  // (For now, ignore $DSL notation and types)
  const responseModsForState = findPathInObject(state, content) as Record<
    string,
    Schema
  >;
  // TODO: Ignore DSL/convert elements
  // verify none of the elements are `undefined`, throws if some are missing
  DFSVerifyNoneAreUndefined(responseModsForState);
  return responseModsForState;
};

export const getValidResponsesForOperationWithState = (
  operation: Operation,
  state: UnmockServiceState,
): { [statusCode: number]: Record<string, Schema> } | undefined => {
  // Check if any non-DSL specific elements are found in the Operation under responses.
  // We do not resolve anything at this point.
  const responses = operation.responses;
  const statusCode = state.$code;
  if (statusCode !== undefined) {
    // Applies only to specific response
    const response = (responses as any)[statusCode] as Response;
    if (response === undefined || response.content === undefined) {
      return undefined;
    }
    delete state.$code; // TODO: Remove other top-level DSL elements...
    const content = response.content[Object.keys(response.content)[0]];
    return { [statusCode]: verifyResponseWithState(content, state) };
  }
  throw new Error(`Not implemented yet for all paths`);
};

export const findPathInObject = (
  path: any,
  obj: any,
): { [key: string]: any | undefined } => {
  const matches: { [key: string]: any } = {};
  for (const key of Object.keys(path)) {
    if (["string", "number", "boolean"].includes(typeof path[key])) {
      matches[key] = obj[key]; // undefined if it doesn't exist, otherwise we type check elsewhere.
      continue;
    }
    if (typeof path[key] === "object" && Object.keys(path[key]).length > 0) {
      if (typeof obj[key] !== "object" || Object.keys(obj[key]).length === 0) {
        matches[key] = undefined;
        continue;
      }
      matches[key] = findPathInObject(path[key], obj[key]);
      continue;
    }
    throw new Error(
      `Path[key] (${path} with ${key}) is not an object, string, number or boolean!`,
    );
  }
  return matches;
};

export const getAtLevel = (
  nestedObj: any,
  level: number,
  filterFn?: (key: string, value: any) => boolean,
) => {
  /** Returns all nested objects at a certain level from nestedObj with additional
   * filtering based on key and value from callback. Filtering only applies at the requested level.
   * `level` is 0-based.
   * Works in BFS manner.
   */
  if (level < 0) {
    throw new Error(`Not sure what should I find at nested level ${level}...`);
  }
  if (nestedObj === undefined || Object.keys(nestedObj).length === 0) {
    throw new Error(
      `Empty 'nestedObj' received - ${JSON.stringify(nestedObj)}`,
    );
  }
  let i = 0;
  let subObjects: any[] = [];
  let prevObjects: any[] = [nestedObj];
  while (i < level) {
    prevObjects.forEach(o => {
      if (typeof o === "object") {
        Object.values(o).forEach(v => subObjects.push(v));
      }
    });
    prevObjects = subObjects;
    subObjects = [];
    i++;
  }
  prevObjects.forEach(o => {
    if (typeof o === "object") {
      Object.keys(o).forEach(k => {
        if (filterFn === undefined || filterFn(k, o[k])) {
          subObjects.push({ [k]: o[k] });
        }
      });
    }
  });
  return subObjects;
};
