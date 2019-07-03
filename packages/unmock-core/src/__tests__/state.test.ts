import fs from "fs";
import jsYaml from "js-yaml";
import path from "path";
import { State } from "../service/state/state";

const schema = jsYaml.safeLoad(
  fs.readFileSync(
    path.join(__dirname, "__unmock__", "petstore", "spec_parsed.yaml"),
    "utf-8",
  ),
);

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
  it("saves states as expected", () => {
    const state = new State();
    state.update({
      stateInput: { method: "any", endpoint: "**", newState: { id: 5 } },
      serviceName: "foo",
      paths: fullSchema.paths,
      schemaEndpoint: "**",
    });
    console.log(
      state.getState("get", "/", fullSchema.paths["/test/{test_id}"].get),
    );
  });
});
