import XRegExp from "xregexp";
import {
  buildPathRegexStringFromParameters,
  getAtLevel,
  getPathParametersFromPath,
  getPathParametersFromSchema,
} from "../service/util";

describe("Tests getAtLevel", () => {
  const schema = {
    "/pet/{petId}": { get: { 200: {}, default: {} } },
    "/pets": {
      get: { 200: {}, default: {} },
      post: { 201: {}, default: {} },
    },
  };
  it("tests different levels without filter", () => {
    expect(getAtLevel(schema, 0).length).toBe(2); // Only 2 items at first level
    expect(getAtLevel(schema, 1).length).toBe(3); // 3 methods present
    expect(getAtLevel(schema, 2).length).toBe(6); // 6 matching response codes and defaults
    expect(getAtLevel(schema, 3).length).toBe(0); // Empty content
  });

  it("tests illogical levels without filter", () => {
    expect(() => getAtLevel(schema, -1)).toThrow("Not sure");
    expect(getAtLevel(schema, 100).length).toBe(0);
  });

  it("tests with invalid object", () => {
    expect(() => getAtLevel(undefined, 2)).toThrow("nestedObj");
    expect(() => getAtLevel({}, 2)).toThrow("nestedObj");
  });

  it("Tests with filters", () => {
    expect(
      getAtLevel(schema, 0, (k: string, _: any) => k === "/pets").length,
    ).toBe(1);
    expect(
      getAtLevel(schema, 1, (k: string, _: any) => k === "post").length,
    ).toBe(1);
    expect(
      getAtLevel(schema, 2, (k: string, _: any) => k === "200").length,
    ).toBe(2);
  });
});

describe("Tests getPathParametersFromPath", () => {
  it("Tests a path without parameters", () => {
    expect(getPathParametersFromPath("/pets").length).toBe(0);
  });

  it("Tests a path with a single parameters", () => {
    const params = getPathParametersFromPath("/pets/{petId}");
    expect(params.length).toBe(1);
    expect(params[0]).toBe("petId");
  });

  it("Tests a path with multiple parameters", () => {
    const params = getPathParametersFromPath("/stores/{storeId}/{product}");
    expect(params.length).toBe(2);
    expect(params[0]).toBe("storeId");
    expect(params[1]).toBe("product");
  });

  it("Tests with empty path", () => {
    expect(getPathParametersFromPath("").length).toBe(0);
    // Check with undefined and null even though the type is meant to be concretely string
    // @ts-ignore
    expect(getPathParametersFromPath(undefined).length).toBe(0);
    // @ts-ignore
    expect(getPathParametersFromPath(null).length).toBe(0);
  });
});

describe("Tests getPathParametersFromSchema", () => {
  it("Tests a path without parameters", () => {
    const schema = { "/pets": { get: { parameters: [{ in: "path" }] } } };
    expect(getPathParametersFromSchema(schema, "/pets").length).toBe(0);
  });

  it("Tests a dynamic path with existing parameters", () => {
    const schema = {
      "/pets/{petId}": {
        get: {
          parameters: [
            { in: "path", name: "petId" },
            { in: "query", name: "foo" },
          ],
        },
      },
    };
    expect(getPathParametersFromSchema(schema, "/pets/{petId}").length).toBe(1);
  });

  it("Tests a path without schema", () => {
    const schema = {
      "/pets/{petId}": { get: { parameters: [{ in: "path" }] } },
    };
    expect(getPathParametersFromSchema(schema, "/pets/").length).toBe(0);
  });

  it("Tests a dynamic path without parameters", () => {
    const schema = { "/pets/{petId}": { get: { parameters: []] } } };
    expect(() => getPathParametersFromSchema(schema, "/pets/{petId}")).toThrow(
      "no description for path parameters",
    );
  });
});

describe("Tests buildPathRegexStringFromParameters", () => {
  const emptySchema: any[] = [];
  const schemaWithMatchingParams = [
    {
      0: { in: "path", name: "petId" },
      1: { in: "query", name: "foo" },
    },
  ];
  const schemaWithMissingParams = [
    {
      0: { in: "path", name: "id" },
      1: { in: "query", name: "foo" },
    },
  ];

  it("Tests path", () => {
    // Empty schema - nothing to do
    expect(buildPathRegexStringFromParameters("/pets", emptySchema, [])).toBe("/pets");
    // Empty schema - nothing to do (even if parameters are given)
    expect(buildPathRegexStringFromParameters("/pets", emptySchema, ["petId"])).toBe("/pets");
    // Parameter from path matches parameter from schema, but no replacement takes place
    expect(buildPathRegexStringFromParameters("/pets", schemaWithMatchingParams, ["petId"])).toBe("/pets");
    // Expected to fail as we still have a path parameter that was unresolved
    expect(() => buildPathRegexStringFromParameters("/pets", schemaWithMissingParams, ["petId"]))
      .toThrow("following path parameters have not been described");
  });

  it("Tests dynamic path", () => {
    // Empty schema - nothing to do
    expect(buildPathRegexStringFromParameters("/pets/{petId}", emptySchema, [])).toBe("/pets/{petId}");
    expect(buildPathRegexStringFromParameters("/pets/{petId}", emptySchema, ["petId"])).toBe("/pets/{petId}");
    // Replacement should happen
    const newPath = buildPathRegexStringFromParameters("/pets/{petId}", schemaWithMatchingParams, ["petId"]);
    expect(newPath).toBe("/pets/(?<petId>[^/]+)");
    expect(XRegExp(newPath).test("/pets/2")).toBeTruthy();
    // Expected to fail as we still have a path parameter that was unresolved
    expect(() => buildPathRegexStringFromParameters("/pets/{petId}", schemaWithMissingParams, ["petId"]))
      .toThrow("following path parameters have not been described");
  });
});
