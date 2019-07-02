import { Response, Schema } from "../service/interfaces";
import { StateRequestValidator } from "../service/validator";

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
const response: Response = {
  content: {
    "application/json": {
      schema,
    },
  },
  description: "foo bar",
};

describe("Tests findStatePathInService", () => {
  it("with empty path", () => {
    const resp = response.content as any;
    const spreadState = StateRequestValidator.spreadStateFromService(
      resp["application/json"].schema.properties,
      {},
    );
    expect(spreadState).toEqual({}); // Empty state => empty spread state
  });

  it("with specific path", () => {
    const resp = response.content as any;
    const spreadState = StateRequestValidator.spreadStateFromService(
      resp["application/json"].schema.properties,
      { test: { id: "a" } },
    );
    expect(spreadState).toEqual({
      // Spreading from "test: { id : { ... " to also inlucde properties
      test: {
        properties: {
          id: {
            type: "integer",
            format: "int64",
          },
        },
      },
    });
  });

  it("with vague path", () => {
    const resp = response.content as any;
    const spreadState = StateRequestValidator.spreadStateFromService(
      resp["application/json"].schema.properties,
      { id: "a" },
    );
    // Spreading from "id : { ... " should match all nested "id"s
    expect(spreadState).toEqual({
      id: {
        test: {
          properties: {
            id: {
              type: "integer",
              format: "int64",
            },
          },
        },
        foo: {
          properties: {
            bar: {
              properties: {
                id: {
                  type: "integer",
                },
              },
            },
          },
        },
      },
    });
  });

  it("with missing parameters", () => {
    const resp = response.content as any;
    const spreadState = StateRequestValidator.spreadStateFromService(
      resp["application/json"].schema.properties,
      { ida: "a" },
    );
    expect(spreadState.ida).toBeUndefined(); // Nothing to spread
  });
});

describe("Tests getUpdatedStateFromContent", () => {
  it("with empty path", () => {
    const resp = response.content as any;
    const spreadState = StateRequestValidator.getUpdatedStateFromContent(
      resp["application/json"],
      {},
    );
    expect(spreadState).toEqual({});
  });

  it("with invalid parameter", () => {
    const resp = response.content as any;
    const spreadState = () =>
      StateRequestValidator.getUpdatedStateFromContent(
        resp["application/json"],
        { boom: 5 },
      );
    expect(spreadState).toThrow("Can't find definition for boom");
  });

  it("with empty schema", () => {
    const resp = response.content as any;
    const spreadState = () =>
      StateRequestValidator.getUpdatedStateFromContent(resp.boom, {});
    expect(spreadState).toThrow("No schema defined");

    const resp2 = {
      "application/json": {},
    };
    const spreadState2 = () =>
      StateRequestValidator.getUpdatedStateFromContent(
        resp2["application/json"],
        {},
      );
    expect(spreadState).toThrow("No schema defined");
  });
});

describe("Tests getValidResponsesForOperationWithState", () => {
  it("with $code specified", () => {
    const op = { responses: { 200: { ...response } } };
    const spreadState = StateRequestValidator.getValidResponsesForOperationWithState(
      op,
      { $code: 200 },
    );
    expect(spreadState).toEqual({ 200: { "application/json": {} } });
  });

  it("with missing $code specified", () => {
    const op = { responses: { 200: { ...response } } };
    const spreadState = StateRequestValidator.getValidResponsesForOperationWithState(
      op,
      { $code: 404 },
    );
    expect(spreadState).toEqual(undefined);
  });

  it("with no $code specified", () => {
    const op = { responses: { 200: { ...response } } };
    const spreadState = StateRequestValidator.getValidResponsesForOperationWithState(
      op,
      {
        id: 5,
      },
    );
    expect(spreadState).toEqual({
      200: {
        "application/json": {
          id: {
            test: {
              properties: {
                id: {
                  type: "integer",
                  format: "int64",
                },
              },
            },
            foo: {
              properties: {
                bar: {
                  properties: {
                    id: {
                      type: "integer",
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
  });
});
