import fs from "fs";
import jsyaml from "js-yaml";
import pointer from "json-pointer";
import fspath from "path";
import XRegExp from "xregexp";
import { OAS_PATH_PARAM_REGEXP, OAS_PATH_PARAMS_KW } from "./constants";
import { OpenAPIObject, Parameter, Paths } from "./interfaces";

/**
 * Simple dereferencing JSON schema $ref with JSON pointers or URIs.
 * See https://json-schema.org/understanding-json-schema/structuring.html for more.
 */
export function derefIfNeeded({
  schema,
  absPath,
}: {
  schema: OpenAPIObject;
  absPath: string;
}) {
  return <T>(mightHaveReference: any): T => {
    const selfDeref = derefIfNeeded({ schema, absPath });
    if (
      typeof mightHaveReference !== "object" ||
      Object.keys(mightHaveReference).length === 0
    ) {
      return mightHaveReference;
    }
    // DFS deref all items as needed
    const noReferences = Array.isArray(mightHaveReference)
      ? mightHaveReference.map(element => selfDeref(element))
      : Object.keys(mightHaveReference).reduce(
          (obj, childKey) => ({
            ...obj,
            [childKey]: selfDeref(mightHaveReference[childKey]),
          }),
          mightHaveReference,
        );
    const refValue = noReferences.$ref; // There would be no '$ref' in arrays ofc
    if (refValue === undefined) {
      return noReferences;
    }
    // decide between local and path URI
    // TODO: Add dereferencing $id and URLs
    const isLocal = refValue.startsWith("#");
    const afterPound = refValue
      .split("#")
      .slice(1)
      .join("#");

    const resolvedSchema = isLocal
      ? schema
      : loadSpec(fspath.join(absPath, refValue.split("#")[0]));
    const ref = pointer.get(resolvedSchema, afterPound);
    return selfDeref(ref) as T;
  };
}

const loadSpec = (path: string) => {
  const content = fs.readFileSync(path, "utf8");
  return fspath.extname(path).toLowerCase() === ".json"
    ? JSON.parse(content)
    : jsyaml.safeLoad(content);
};

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
    // v could be "null" if specifically designed in schema
    (_: string | undefined, v: any) =>
      v !== null && v.in === OAS_PATH_PARAMS_KW,
  ) as Parameter[];
  if (schemaPathParameters.length === 0) {
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
  schemaParameters.forEach((p: Parameter) => {
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

/** Returns all nested objects at a certain level from nestedObj with additional
 * filtering based on key and value from callback. Filtering only applies at the requested level.
 * `level` is 0-based. Works in BFS manner.
 */
export const getAtLevel = (
  nestedObj: any,
  level: number,
  filterFn?: (key: string | undefined, value: any) => boolean,
) => {
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
      if (Array.isArray(o)) {
        o.forEach(e => subObjects.push(e));
      } else if (typeof o === "object") {
        const vals = Object.values(o);
        if (vals.length === 1) {
          subObjects.push(vals[0]);
        } else {
          Object.values(o).forEach(v => subObjects.push(v));
        }
      }
    });
    prevObjects = subObjects;
    subObjects = [];
    i++;
  }
  prevObjects.forEach(o => {
    if (Array.isArray(o)) {
      o.forEach(e => {
        if (filterFn === undefined || filterFn(undefined, e)) {
          subObjects.push(e);
        }
      });
    } else if (typeof o === "object") {
      Object.keys(o).forEach(k => {
        if (filterFn === undefined || filterFn(k, o[k])) {
          subObjects.push({ [k]: o[k] });
        }
      });
    }
  });
  return subObjects;
};
