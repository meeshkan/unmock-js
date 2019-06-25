import XRegExp from "xregexp";
import { OAS_PATH_PARAM_REGEXP, OAS_PATH_PARAMS_KW } from "./constants";
import { OASSchema } from "./interfaces";

export const getPathParametersFromPath = (path: string): string[] => {
  const pathParameters: string[] = [];
  XRegExp.forEach(path, OAS_PATH_PARAM_REGEXP, (matchArr: RegExpExecArray) => {
    pathParameters.push(matchArr[1]);
  });
  return pathParameters;
};

export const getPathParametersFromSchema = (
  schema: OASSchema,
  path: string,
): any[] => {
  if (!path.includes("{") || schema[path] === undefined) {
    // No parameters in this path... Why bother looking?
    return [];
  }
  const schemaPathParameters = getAtLevel(
    schema[path],
    2,
    (_: string, v: any) => v.in === OAS_PATH_PARAMS_KW,
  );
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
  schemaParameters: any[],
  pathParameters: string[],
): string => {
  if (
    schemaParameters.length === 0 ||
    Object.values(schemaParameters[0]).length === 0
  ) {
    return path;
  }

  let newPath = `${path}`;
  // Assumption: All methods describe the parameter the same way.
  Object.values(schemaParameters[0]).forEach((p: any) => {
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

export const getAtLevel = (
  nestedObj: any,
  level: number,
  filterFn?: (key: string, value: any) => boolean,
) => {
  /** Returns all nested objects at a certain level from nestedObj with additional
   * filtering based on key and value from callback. Filtering only applies at the requested level.
   * `level` is 0-based.
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
