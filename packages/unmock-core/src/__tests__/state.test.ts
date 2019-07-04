import { State } from "../service/state/state";

const fullSchema = {
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
                  properties: {
                    notId: {
                      type: "string",
                    },
                  },
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

describe("Test state management", () => {
  it("returns undefined when setting empty state", () => {
    const state = new State();
    expect(
      state.update({
        stateInput: { method: "any", endpoint: "**", newState: {} },
        serviceName: "foo",
        paths: fullSchema.paths,
        schemaEndpoint: "**",
      }),
    ).toBeUndefined();
  });

  it("throws when setting state for non-existing method with generic endpoint", () => {
    const state = new State();
    expect(() =>
      state.update({
        stateInput: { method: "post", endpoint: "**", newState: {} },
        serviceName: "foo",
        paths: fullSchema.paths,
        schemaEndpoint: "**",
      }),
    ).toThrow("Can't find any endpoints with method 'post'");
  });

  it("throws when setting state for non-existing method with specific, existing endpoint", () => {
    const state = new State();
    expect(() =>
      state.update({
        stateInput: { method: "post", endpoint: "/test/5", newState: {} },
        serviceName: "foo",
        paths: fullSchema.paths,
        schemaEndpoint: "/test/{test_id}",
      }),
    ).toThrow("Can't find response for 'post /test/5'");
  });

  it("saves state from any endpoint and get method as expected", () => {
    const state = new State();
    state.update({
      stateInput: {
        method: "get",
        endpoint: "**",
        newState: { foo: { id: 5 } },
      },
      serviceName: "foo",
      paths: fullSchema.paths,
      schemaEndpoint: "**",
    });
    const stateResult = state.getState(
      "get",
      "/",
      fullSchema.paths["/test/{test_id}"].get,
    );
    expect(stateResult).toEqual({
      200: {
        "application/json": {
          items: {
            properties: {
              foo: {
                properties: {
                  id: 5,
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
    state.update({
      stateInput: { method: "any", endpoint: "**", newState: { id: 5 } },
      serviceName: "foo",
      paths: fullSchema.paths,
      schemaEndpoint: "**",
    });
    const stateResult = state.getState(
      "get",
      "/",
      fullSchema.paths["/test/{test_id}"].get,
    );
    expect(stateResult).toEqual({
      200: {
        "application/json": {
          items: {
            properties: {
              id: 5,
            },
          },
        },
      },
    });
  });

  it("spreads states from multiple paths correctly", () => {
    const state = new State();
    state.update({
      stateInput: { method: "any", endpoint: "**", newState: { id: 5 } },
      serviceName: "foo",
      paths: fullSchema.paths,
      schemaEndpoint: "**",
    });
    state.update({
      stateInput: { method: "any", endpoint: "/test/5", newState: { id: 3 } },
      serviceName: "foo",
      paths: fullSchema.paths,
      schemaEndpoint: "/test/{test_id}",
    });
    state.update({
      stateInput: { method: "any", endpoint: "/test/*", newState: { id: -1 } },
      serviceName: "foo",
      paths: fullSchema.paths,
      schemaEndpoint: "/test/{test_id}",
    });
    const stateResult = state.getState(
      "get",
      "/test/5",
      fullSchema.paths["/test/{test_id}"].get,
    );
    expect(stateResult).toEqual({
      200: {
        "application/json": {
          items: {
            properties: {
              id: 3,
            },
          },
        },
      },
    });
  });

  it("saves nested state correctly", () => {
    const state = new State();
    state.update({
      stateInput: {
        method: "any",
        endpoint: "**",
        newState: { foo: { id: 5 } },
      },
      serviceName: "foo",
      paths: fullSchema.paths,
      schemaEndpoint: "**",
    });
    const stateResult = state.getState(
      "get",
      "/",
      fullSchema.paths["/test/{test_id}"].get,
    );
    expect(stateResult).toEqual({
      200: {
        "application/json": {
          items: {
            properties: {
              foo: {
                properties: {
                  id: 5,
                },
              },
            },
          },
        },
      },
    });
  });
});
