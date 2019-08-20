import { Schema } from "../service/interfaces";
import {
  objResponse,
  TEXT_RESPONSE_ERROR,
  textResponse,
} from "../service/state/transformers";

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
    const p = textResponse();
    expect(p.isEmpty).toBeTruthy();
    expect(p.top).toEqual({});
    // @ts-ignore // deliberately checking with empty input
    expect(p.gen()).toEqual({ spreadState: {}, error: TEXT_RESPONSE_ERROR });
  });

  it("returns empty object for empty state", () => {
    const p = textResponse("");
    expect(p.isEmpty).toBeTruthy();
    expect(p.top).toEqual({});
    // @ts-ignore // deliberately checking with empty input
    expect(p.gen()).toEqual({ spreadState: {}, error: TEXT_RESPONSE_ERROR });
  });

  it("returns empty object for empty schema", () => {
    const p = textResponse("foo");
    expect(p.isEmpty).toBeFalsy();
    expect(p.top).toEqual({});
    // @ts-ignore // deliberately checking with empty input
    expect(p.gen()).toEqual({ spreadState: {}, error: TEXT_RESPONSE_ERROR });
  });

  it("returns empty object for non-text schema", () => {
    const p = textResponse("foo");
    expect(p.isEmpty).toBeFalsy();
    expect(p.top).toEqual({});
    expect(p.gen({ type: "array", items: {} })).toEqual({
      spreadState: {},
      error: TEXT_RESPONSE_ERROR,
    });
  });

  it("returns correct state object for valid input", () => {
    const p = textResponse("foo");
    expect(p.isEmpty).toBeFalsy();
    expect(p.top).toEqual({});
    expect(p.gen({ type: "string" })).toEqual({
      spreadState: { type: "string", const: "foo" },
    });
  });

  it("top level DSL doesn't change response", () => {
    // @ts-ignore // invalid value on purpose
    const p = textResponse("foo", { $code: 200, notDSL: "a" });
    expect(p.isEmpty).toBeFalsy();
    expect(p.top).toEqual({ $code: 200 }); // non DSL is filtered out
    expect(p.gen({ type: "string" })).toEqual({
      spreadState: { type: "string", const: "foo" },
    });
  });
});

describe("Test object provider", () => {
  it("returns empty objects for undefined state", () => {
    const p = objResponse();
    expect(p.isEmpty).toBeTruthy();
    expect(p.top).toEqual({});
    expect(p.gen({})).toEqual({ spreadState: {} });
  });

  it("returns empty objects for empty state", () => {
    const p = objResponse({});
    expect(p.isEmpty).toBeTruthy();
    expect(p.top).toEqual({});
    expect(p.gen({})).toEqual({ spreadState: {} });
  });

  it("filters out top level DSL from state", () => {
    const p = objResponse({ $code: 200, foo: "bar" });
    expect(p.isEmpty).toBeFalsy();
    expect(p.top).toEqual({ $code: 200 });
    expect(p.gen({}).spreadState).toEqual({});
    expect(p.gen({}).error).toContain("'foo'"); // no schema to expand
    expect(p.gen({ properties: { foo: { type: "string" } } })).toEqual({
      spreadState: {
        properties: {
          foo: {
            type: "string",
            const: "bar",
          },
        },
      },
    });
  });

  it("with empty path", () => {
    const spreadState = objResponse({}).gen(schema);
    expect(spreadState).toEqual({ spreadState: {} }); // Empty state => empty spread state
  });

  it("with undefined or null values", () => {
    // What does it mean to have undefined/null as value?
    [undefined, null].forEach(val => {
      // @ts-ignore - yes it's not allowed by type, we still want to verify the logic
      const res = objResponse({ test: val }).gen(schema);
      expect(res.error).toContain("undefined or null");
      expect(res.spreadState).toEqual({});
    });
  });

  it("with specific path", () => {
    const spreadState = objResponse({
      test: { id: "a" },
    }).gen(schema);
    expect(spreadState.spreadState).toEqual({});
    expect(spreadState.error).toContain("'id'");
  });

  it("with vague path", () => {
    const spreadState = objResponse({ id: 5 }).gen(schema);
    // no "id" in top-most level or immediately under properties\items
    expect(spreadState.spreadState).toEqual({});
    expect(spreadState.error).toContain("'id'");
  });

  it("with missing parameters", () => {
    const spreadState = objResponse({ ida: "a" }).gen(schema);
    expect(spreadState.spreadState).toEqual({});
    expect(spreadState.error).toContain("'ida'");
  });
});
