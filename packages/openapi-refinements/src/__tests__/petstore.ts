import { OpenAPIObject } from "loas3/dist/generated/full";

const petstore: OpenAPIObject = {
  openapi: "3.0.0",
  info: {
    version: "1.0.0",
    title: "Swagger Petstore",
    license: {
      name: "MIT",
    },
  },
  servers: [
    {
      url: "http://petstore.swagger.io/v1",
    },
  ],
  paths: {
    "/pets": {
      get: {
        summary: "List all pets",
        operationId: "listPets",
        tags: ["pets"],
        parameters: [
          {
            name: "limit",
            in: "query",
            description: "How many items to return at one time (max 100)",
            required: false,
            schema: {
              type: "integer",
              format: "int32",
            },
          },
        ],
        responses: {
          "200": {
            description: "A paged array of pets",
            headers: {
              "x-next": {
                description: "A link to the next page of responses",
                schema: {
                  type: "string",
                },
              },
            },
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/Pets",
                },
              },
            },
          },
          default: {
            description: "unexpected error",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/Error",
                },
              },
            },
          },
        },
      },
      post: {
        summary: "Create a pet",
        operationId: "createPets",
        tags: ["pets"],
        responses: {
          201: {
            description: "Null response",
          },
          default: {
            description: "unexpected error",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/Error",
                },
              },
            },
          },
        },
      },
    },
    "/pets/{petId}": {
      get: {
        summary: "Info for a specific pet",
        operationId: "showPetById",
        tags: ["pets"],
        parameters: [
          {
            name: "petId",
            in: "path",
            required: true,
            description: "The id of the pet to retrieve",
            schema: {
              type: "string",
            },
          },
        ],
        responses: {
          200: {
            description: "Expected response to a valid request",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/Pet",
                },
              },
            },
          },
          default: {
            description: "unexpected error",
            content: {
              "application/json": {
                schema: {
                  oneOf: [
                    { $ref: "#/components/schemas/Error" },
                    { $ref: "#/components/schemas/Error2" },
                    { $ref: "#/components/schemas/Error3" },
                    { $ref: "#/components/schemas/Error4" },
                    { $ref: "#/components/schemas/Error5" },
                  ],
                },
              },
            },
          },
        },
      },
    },
  },
  components: {
    schemas: {
      Pet: {
        type: "object",
        required: ["id", "name"],
        properties: {
          id: {
            type: "integer",
            format: "int64",
          },
          name: {
            type: "string",
          },
          tags: {
            type: "array",
            items: {
              type: "string",
              enum: ["cute", "happy", "sad"],
            },
          },
        },
      },
      Pets: {
        type: "array",
        items: {
          $ref: "#/components/schemas/Pet",
        },
      },
      Error: {
        type: "object",
        required: ["code", "message"],
        properties: {
          code: {
            type: "integer",
            format: "int32",
          },
          message: {
            type: "string",
          },
        },
      },
      Error2: {
        type: "object",
        required: ["code", "message"],
        properties: {
          code: {
            type: "integer",
            format: "int32",
          },
          message: {
            type: "string",
          },
        },
      },
      Error3: {
        type: "object",
        required: ["code", "message"],
        properties: {
          code: {
            type: "integer",
            format: "int32",
          },
          message: {
            type: "string",
          },
        },
      },
      Error4: {
        type: "object",
        required: ["code", "message"],
        properties: {
          code: {
            type: "integer",
            format: "int32",
          },
          message: {
            type: "string",
          },
        },
      },
      Error5: {
        type: "object",
        required: ["code", "message"],
        properties: {
          code: {
            type: "integer",
            format: "int32",
          },
          message: {
            type: "string",
          },
        },
      },
    },
  },
};
export default petstore;
