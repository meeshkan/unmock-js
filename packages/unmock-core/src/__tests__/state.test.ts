import {
  ExtendedHTTPMethod,
  HTTPMethod,
  IStateInputGenerator,
} from "../service/interfaces";
import defMiddleware, { textMW } from "../service/state/middleware";
import { State } from "../service/state/state";

const fullSchema = {
  openapi: "",
  info: {
    title: "",
    version: "",
  },
  paths: {
    "/test/{test_id}": {
      get: {
        parameters: [
          {
            name: "test_id",
            in: "path",
          },
        ],
        responses: {
          200: {
            description: "bar",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: {
                    properties: {
                      foo: {
                        type: "object",
                        properties: {
                          id: {
                            type: "integer",
                          },
                        },
                      },
                      id: {
                        type: "integer",
                      },
                    },
                  },
                },
              },
              "text/plain": {
                schema: {
                  type: "string",
                },
              },
            },
          },
          default: {
            description: "baz",
            content: {
              "application/json": {
                schema: {
                  properties: {
                    error: {
                      type: "string",
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
};

const updateState = (
  state: State,
  method: ExtendedHTTPMethod,
  endpoint: string,
  newState: IStateInputGenerator,
  schemaEndpoint: string,
) =>
  state.update({
    stateInput: {
      method,
      endpoint,
      newState,
    },
    serviceName: "foo",
    schemaInfo: { schema: fullSchema, absPath: "" },
    schemaEndpoint,
  });

const getState = (state: State, method: HTTPMethod, endpoint: string) =>
  state.getState(method, endpoint, fullSchema.paths["/test/{test_id}"].get);

describe("Test state management", () => {
  it("returns undefined when setting empty state", () => {
    const state = new State();
    expect(
      updateState(state, "any", "**", defMiddleware(), "**"),
    ).toBeUndefined();
  });

  it("throws when setting state for non-existing method with generic endpoint", () => {
    const state = new State();
    expect(() =>
      updateState(state, "post", "**", defMiddleware(), "**"),
    ).toThrow("Can't find any endpoints with method 'post'");
  });

  it("throws when setting state for non-existing method with specific, existing endpoint", () => {
    const state = new State();
    expect(() =>
      updateState(state, "post", "/test/5", defMiddleware(), "/test/{test_id}"),
    ).toThrow("Can't find response for 'post /test/5'");
  });

  it("saves state from any endpoint and get method as expected", () => {
    const state = new State();
    updateState(state, "get", "**", defMiddleware({ foo: { id: 5 } }), "**");
    const stateResult = getState(state, "get", "/");
    expect(stateResult).toEqual({
      200: {
        "application/json": {
          items: {
            properties: {
              foo: {
                properties: {
                  id: {
                    type: "integer",
                    const: 5,
                  },
                },
              },
            },
          },
        },
      },
    });
  });

  it("parses $times on specific endpoint as expected", () => {
    const state = new State();
    updateState(state, "get", "**", defMiddleware({ id: 5, $times: 2 }), "**");
    const getRes = () => getState(state, "get", "/");
    expect(getRes()).toEqual({
      200: {
        "application/json": {
          items: {
            properties: {
              id: {
                type: "integer",
                const: 5,
              },
            },
          },
        },
      },
    });
    expect(getRes()).toEqual({
      200: {
        "application/json": {
          items: {
            properties: {
              id: {
                type: "integer",
                const: 5,
              },
            },
          },
        },
      },
    });
    expect(getRes()).not.toEqual({
      200: {
        "application/json": {
          items: {
            properties: {
              foo: {
                properties: {
                  id: {
                    type: "integer",
                    const: 5,
                  },
                },
              },
            },
          },
        },
      },
    });
  });

  it("saves state from any endpoint and any method as expected", () => {
    const state = new State();
    updateState(state, "any", "**", defMiddleware({ id: 5 }), "**");
    const stateResult = getState(state, "get", "/");
    expect(stateResult).toEqual({
      200: {
        "application/json": {
          items: {
            properties: {
              id: {
                type: "integer",
                const: 5,
              },
            },
          },
        },
      },
    });
  });

  it("spreads states from multiple paths correctly", () => {
    const state = new State();
    updateState(state, "any", "**", defMiddleware({ id: 5 }), "**");
    updateState(
      state,
      "any",
      "/test/5",
      defMiddleware({ id: 3 }),
      "/test/{test_id}",
    );
    updateState(
      state,
      "any",
      "/test/*",
      defMiddleware({ id: -1 }),
      "/test/{test_id}",
    );
    const stateResult = getState(state, "get", "/test/5");
    expect(stateResult).toEqual({
      200: {
        "application/json": {
          items: {
            properties: {
              id: {
                type: "integer",
                const: 3,
              },
            },
          },
        },
      },
    });
  });

  it("saves nested state correctly", () => {
    const state = new State();
    updateState(state, "any", "**", defMiddleware({ foo: { id: 5 } }), "**");
    const stateResult = getState(state, "get", "/");
    expect(stateResult).toEqual({
      200: {
        "application/json": {
          items: {
            properties: {
              foo: {
                properties: {
                  id: {
                    type: "integer",
                    const: 5,
                  },
                },
              },
            },
          },
        },
      },
    });
  });

  it("Handles textual state correctly", () => {
    const state = new State();
    updateState(state, "any", "**", textMW("foobar"), "**");
    const stateResult = getState(state, "get", "/");
    expect(stateResult).toEqual({
      200: { "text/plain": { const: "foobar", type: "string" } },
    });
  });
});
