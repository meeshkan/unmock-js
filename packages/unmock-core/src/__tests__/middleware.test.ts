import { middleware } from "../index";
import { Schema } from "../service/interfaces";

const schema: Schema = {
  properties: {
    test: {
      type: "object",
      properties: {
        id: {
          type: "integer",
          format: "int64",
        },
      },
    },
    name: {
      type: "string",
    },
    foo: {
      type: "object",
      properties: {
        bar: {
          type: "object",
          properties: {
            id: {
              type: "integer",
            },
          },
        },
      },
    },
    tag: { type: "string" },
  },
};

describe("Test text provider", () => {
  it("returns empty object for undefined state", () => {
    const p = middleware.textMW();
    expect(p.isEmpty).toBeTruthy();
    expect(p.top).toEqual({});
    // @ts-ignore // deliberately checking with empty input
    expect(p.gen()).toEqual({});
  });

  it("returns empty object for empty state", () => {
    const p = middleware.textMW("");
    expect(p.isEmpty).toBeTruthy();
    expect(p.top).toEqual({});
    // @ts-ignore // deliberately checking with empty input
    expect(p.gen()).toEqual({});
  });

  it("returns empty object for empty schema", () => {
    const p = middleware.textMW("foo");
    expect(p.isEmpty).toBeFalsy();
    expect(p.top).toEqual({});
    // @ts-ignore // deliberately checking with empty input
    expect(p.gen()).toEqual({});
  });

  it("returns empty object for non-text schema", () => {
    const p = middleware.textMW("foo");
    expect(p.isEmpty).toBeFalsy();
    expect(p.top).toEqual({});
    expect(p.gen({ type: "array", items: {} })).toEqual({});
  });

  it("returns correct state object for valid input", () => {
    const p = middleware.textMW("foo");
    expect(p.isEmpty).toBeFalsy();
    expect(p.top).toEqual({});
    expect(p.gen({ type: "string" })).toEqual({ type: "string", const: "foo" });
  });

  it("top level DSL doesn't change response", () => {
    // @ts-ignore // invalid value on purpose
    const p = middleware.textMW("foo", { $code: 200, notDSL: "a" });
    expect(p.isEmpty).toBeFalsy();
    expect(p.top).toEqual({ $code: 200 }); // non DSL is filtered out
    expect(p.gen({ type: "string" })).toEqual({ type: "string", const: "foo" });
  });
});

describe("Test default provider", () => {
  it("returns empty objects for undefined state", () => {
    const p = middleware.default();
    expect(p.isEmpty).toBeTruthy();
    expect(p.top).toEqual({});
    expect(p.gen({})).toEqual({});
  });

  it("returns empty objects for empty state", () => {
    const p = middleware.default({});
    expect(p.isEmpty).toBeTruthy();
    expect(p.top).toEqual({});
    expect(p.gen({})).toEqual({});
  });

  it("filters out top level DSL from state", () => {
    const p = middleware.default({ $code: 200, foo: "bar" });
    expect(p.isEmpty).toBeFalsy();
    expect(p.top).toEqual({ $code: 200 });
    expect(p.gen({})).toEqual({}); // no schema to expand
    expect(p.gen({ properties: { foo: { type: "string" } } })).toEqual({
      properties: {
        foo: {
          type: "string",
          const: "bar",
        },
      },
    });
  });

  it("with empty path", () => {
    const spreadState = middleware.default({}).gen(schema);
    expect(spreadState).toEqual({}); // Empty state => empty spread state
  });

  it("with specific path", () => {
    const spreadState = middleware
      .default({
        test: { id: "a" },
      })
      .gen(schema);
    expect(spreadState).toEqual({
      // Spreading from "test: { id : { ... " to also inlucde properties
      properties: {
        test: {
          properties: {
            id: null, // Will be removed due to wrong type
          },
        },
      },
    });
  });

  it("with vague path", () => {
    const spreadState = middleware.default({ id: 5 }).gen(schema);
    // no "id" in top-most level or immediately under properties\items
    expect(spreadState).toEqual({ id: null });
  });

  it("with missing parameters", () => {
    const spreadState = middleware.default({ ida: "a" }).gen(schema);
    expect(spreadState).toEqual({ ida: null }); // Nothing to spread
  });
});
