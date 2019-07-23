import { dsl } from "..";
import { Response, Responses, Schema } from "../service/interfaces";
import { getValidStatesForOperationWithState } from "../service/state/validator";

const arraySchema: Schema = {
  type: "array",
  items: {
    properties: {
      id: {
        type: "integer",
        format: "int32",
      },
    },
  },
};
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
  description: "foobar",
};
const op = { responses: { 200: { ...response } } };
const arrResponses: { responses: Responses } = {
  responses: {
    200: {
      description: "foobar",
      content: { "application/json": { schema: arraySchema } },
    },
  },
};
const deref = (obj: any) => obj;

describe("Tests getValidResponsesForOperationWithState", () => {
  it("with empty state", () => {
    const spreadState = getValidStatesForOperationWithState(
      op,
      dsl.objResponse(),
      deref,
    );
    expect(spreadState.error).toBeUndefined();
    expect(spreadState.responses).toBeUndefined();
  });

  it("invalid parameter returns error", () => {
    const spreadState = getValidStatesForOperationWithState(
      op,
      dsl.objResponse({
        boom: 5,
      }),
      deref,
    );
    expect(spreadState.error).toContain("Can't find definition for 'boom'");
  });

  it("empty schema returns error", () => {
    const spreadState = getValidStatesForOperationWithState(
      {
        responses: {
          200: { content: { "application/json": {} }, description: "foo" },
        },
      },
      dsl.objResponse(),
      deref,
    );
    expect(spreadState.error).toContain("No schema defined");
  });

  it("with $code specified", () => {
    const spreadState = getValidStatesForOperationWithState(
      op,
      dsl.objResponse({
        $code: 200,
        tag: "foo",
      }),
      deref,
    );
    expect(spreadState.error).toBeUndefined();
    expect(spreadState.responses).toEqual({
      200: {
        "application/json": {
          properties: { tag: { type: "string", const: "foo" } },
        },
      },
    });
  });

  it("with $size in top-level specified", () => {
    const spreadState = getValidStatesForOperationWithState(
      arrResponses,
      dsl.objResponse({ $size: 5 }),
      deref,
    );
    expect(spreadState.error).toBeUndefined();
    expect(spreadState.responses).toEqual({
      200: {
        "application/json": {
          minItems: 5,
          maxItems: 5,
        },
      },
    });
  });

  it("with missing $code specified", () => {
    const spreadState = getValidStatesForOperationWithState(
      op,
      dsl.objResponse({
        $code: 404,
      }),
      deref,
    );
    expect(spreadState.responses).toBeUndefined();
    expect(spreadState.error).toContain(
      "Can't find response for given status code '404'!",
    );
  });

  it("with no $code specified", () => {
    const spreadState = getValidStatesForOperationWithState(
      op,
      dsl.objResponse({
        test: { id: 5 },
      }),
      deref,
    );
    expect(spreadState.error).toBeUndefined();
    expect(spreadState.responses).toEqual({
      200: {
        "application/json": {
          properties: {
            test: {
              properties: {
                id: {
                  type: "integer",
                  format: "int64",
                  const: 5,
                },
              },
            },
          },
        },
      },
    });
  });
});
