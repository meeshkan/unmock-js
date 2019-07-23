import fs from "fs";
import yaml from "js-yaml";
import path from "path";
import XRegExp from "xregexp";
import { Parameter } from "../service/interfaces";
import {
  buildPathRegexStringFromParameters,
  derefIfNeeded,
  getAtLevel,
  getPathParametersFromPath,
  getPathParametersFromSchema,
} from "../service/util";

describe("Tests deref", () => {
  const absPath = path.join(__dirname, "__unmock__", "petstore");
  const content = fs.readFileSync(path.join(absPath, "spec.yaml"), "utf8");
  let schema: any;
  beforeEach(() => (schema = yaml.safeLoad(content)));

  it("Dereferences local file references", () => {
    schema.components.schemas.Pets.items.$ref = `spec.yaml${schema.components.schemas.Pets.items.$ref}`;
    const derefed = derefIfNeeded({ schema, absPath })(
      schema.components.schemas.Pets,
    );
    expect(derefed).toEqual({
      type: "array",
      items: {
        required: ["id", "name"],
        properties: {
          id: {
            type: "integer",
            format: "int64",
          },
          name: { type: "string" },
          tag: { type: "string" },
        },
      },
    });
  });

  it("Derefences internal references", () => {
    const derefed = derefIfNeeded({ schema, absPath })(
      schema.paths["/pets"].get.responses["200"].content["application/json"]
        .schema,
    );
    expect(derefed).toEqual({
      type: "array",
      items: {
        required: ["id", "name"],
        properties: {
          id: {
            type: "integer",
            format: "int64",
          },
          name: { type: "string" },
          tag: { type: "string" },
        },
      },
    });
  });
});

describe("Tests getAtLevel", () => {
  const schema = {
    "/pet/{petId}": { get: { 200: {}, default: {} } },
    "/pets": {
      get: { 200: {}, default: {} },
      post: { 201: {}, default: {} },
    },
  };
  it("different levels without filter returns all nested items at requested level", () => {
    expect(getAtLevel(schema, 0).length).toBe(2); // Only 2 items at first level
    expect(getAtLevel(schema, 1).length).toBe(3); // 3 methods present
    expect(getAtLevel(schema, 2).length).toBe(6); // 6 matching response codes and defaults
    expect(getAtLevel(schema, 3).length).toBe(0); // Empty content
  });

  it("negative nested level throws", () => {
    expect(() => getAtLevel(schema, -1)).toThrow("Not sure");
  });

  it("excessive nested level returns empty list", () => {
    expect(getAtLevel(schema, 100).length).toBe(0);
  });

  it("getting from invalid object throws", () => {
    expect(() => getAtLevel(undefined, 2)).toThrow("nestedObj");
    expect(() => getAtLevel({}, 2)).toThrow("nestedObj");
  });

  it("using filters returned only matching nested objects", () => {
    let got = getAtLevel(
      schema,
      0,
      (k: string | undefined, _: any) => k === "/pets",
    );
    expect(got.length).toBe(1);
    got = getAtLevel(
      schema,
      1,
      (k: string | undefined, _: any) => k === "post",
    );
    expect(got.length).toBe(1);
    got = getAtLevel(schema, 2, (k: string | undefined, _: any) => k === "200");
    expect(got.length).toBe(2);
  });
});

describe("Tests getPathParametersFromPath", () => {
  it("path without parameters returns empty list", () => {
    expect(getPathParametersFromPath("/pets").length).toBe(0);
  });

  it("path with a single parameters returns a list with single item", () => {
    const params = getPathParametersFromPath("/pets/{petId}");
    expect(params.length).toBe(1);
    expect(params[0]).toBe("petId");
  });

  it("path with multiple parameters returns a list with matching parameters", () => {
    const params = getPathParametersFromPath("/stores/{storeId}/{product}");
    expect(params.length).toBe(2);
    expect(params[0]).toBe("storeId");
    expect(params[1]).toBe("product");
  });

  it("invalid paths returns empty list", () => {
    expect(getPathParametersFromPath("").length).toBe(0);
    // Check with undefined and null even though the type is meant to be concretely string
    // @ts-ignore
    expect(getPathParametersFromPath(undefined).length).toBe(0);
    // @ts-ignore
    expect(getPathParametersFromPath(null).length).toBe(0);
  });
});

describe("Tests getPathParametersFromSchema", () => {
  const baseSchema = (params: Parameter[]) => ({
    get: { parameters: params, responses: {} },
  });
  it("static path without parameters returns empty list", () => {
    const schema = {
      "/pets": { ...baseSchema([{ in: "path", name: "foo" }]) },
    };
    expect(getPathParametersFromSchema(schema, "/pets").length).toBe(0);
  });

  it("dynamic path with existing parameters returns matching items", () => {
    const schema = {
      "/pets/{petId}": {
        ...baseSchema([
          { in: "path", name: "petId" },
          { in: "query", name: "foo" },
        ]),
      },
    };
    expect(getPathParametersFromSchema(schema, "/pets/{petId}").length).toBe(1);
  });

  it("static path without schema returns empty list", () => {
    const schema = {
      "/pets/{petId}": { ...baseSchema([{ in: "path", name: "foo" }]) },
    };
    expect(getPathParametersFromSchema(schema, "/pets/").length).toBe(0);
  });

  it("dynamic path without parameters throws", () => {
    const schema = { "/pets/{petId}": { ...baseSchema([]) } };
    expect(() => getPathParametersFromSchema(schema, "/pets/{petId}")).toThrow(
      "no description for path parameters",
    );
  });
});

describe("Tests buildPathRegexStringFromParameters", () => {
  const emptySchema: any[] = [];
  const schemaWithMatchingParams: Parameter[] = [
    { in: "path", name: "petId" },
    { in: "query", name: "foo" },
  ];
  const schemaWithMissingParams: Parameter[] = [
    { in: "path", name: "id" },
    { in: "query", name: "foo" },
  ];

  describe("static path", () => {
    it("without schema nor parameters stays the same", () => {
      expect(buildPathRegexStringFromParameters("/pets", emptySchema, [])).toBe(
        "/pets",
      );
    });

    it("empty schema with non-empty parameter list stays the same", () => {
      expect(
        buildPathRegexStringFromParameters("/pets", emptySchema, ["petId"]),
      ).toBe("/pets");
    });

    it("non-empty schema with non-empty parameter list stays the same", () => {
      expect(
        buildPathRegexStringFromParameters("/pets", schemaWithMatchingParams, [
          "petId",
        ]),
      ).toBe("/pets");
    });

    it("non-empty schema with missing parameters from list throws", () => {
      // Expected to fail as we still have a path parameter that was unresolved
      expect(() =>
        buildPathRegexStringFromParameters("/pets", schemaWithMissingParams, [
          "petId",
        ]),
      ).toThrow("following path parameters have not been described");
    });
  });

  describe("dynamic path", () => {
    it("empty schema with empty parameter list stays the same", () => {
      expect(
        buildPathRegexStringFromParameters("/pets/{petId}", emptySchema, []),
      ).toBe("/pets/{petId}");
    });

    it("empty schema with non-empty parameter list stays the same", () => {
      expect(
        buildPathRegexStringFromParameters("/pets/{petId}", emptySchema, [
          "petId",
        ]),
      ).toBe("/pets/{petId}");
    });

    it("matching schema and parameter list constructor regexp", () => {
      const newPath = buildPathRegexStringFromParameters(
        "/pets/{petId}",
        schemaWithMatchingParams,
        ["petId"],
      );
      expect(newPath).toBe("/pets/(?<petId>[^/]+)");
      expect(XRegExp(newPath).test("/pets/2")).toBeTruthy();
    });

    it("schema with parameter missing throws", () => {
      expect(() =>
        buildPathRegexStringFromParameters(
          "/pets/{petId}",
          schemaWithMissingParams,
          ["petId"],
        ),
      ).toThrow("following path parameters have not been described");
    });
  });
});
