import * as fs from "fs";
import * as jsYaml from "js-yaml";
import * as path from "path";
import { ServiceCore } from "unmock-core";
import { ISerializedRequest, ISerializedResponse } from "unmock-core";
import { OpenAPIObject } from "unmock-core/dist/service/interfaces";

export const PetStoreSpecLocation = path.join(
  __dirname,
  "__unmock__",
  "petstore",
  "spec.yaml",
);

const petStoreYamlString: string = fs.readFileSync(
  PetStoreSpecLocation,
  "utf-8",
);

export const PetStoreSchema = jsYaml.safeLoad(petStoreYamlString);

export const schemaBase: OpenAPIObject = {
  openapi: "3.0.0",
  info: {
    version: "1.0.0",
    title: "Swagger Petstore",
    license: { name: "MIT" },
  },
  paths: {},
};

// define some service populators that match IOASMappingGenerator type
export const PetStoreServiceWithEmptyPaths = new ServiceCore({
  schema: schemaBase,
  name: "petstore",
});

export const PetStoreServiceWithEmptyResponses = new ServiceCore({
  name: "petstore",
  schema: { ...schemaBase, paths: { "/pets": { get: { responses: {} } } } },
});

export const PetStoreServiceWithPseudoResponses = new ServiceCore({
  name: "petstore",
  schema: {
    ...schemaBase,
    paths: {
      "/pets": {
        get: {
          responses: {
            200: {
              description: "Mock response",
              content: {
                "application/json": {
                  schema: {},
                },
              },
            },
          },
        },
      },
    },
  },
});

export const PetstoreServiceWithDynamicPaths = (
  params: any,
  ...additionalPathElement: string[]
) => {
  const path = `/pets/{petId}${additionalPathElement.join("/")}`;
  return new ServiceCore({
    schema: {
      ...schemaBase,
      paths: {
        [path]: {
          get: {
            summary: "Info for a specific pet",
            operationId: "showPetById",
            tags: ["pets"],
            ...params,
            responses: {
              200: {
                content: {
                  "application/json": {
                    schema: {},
                  },
                },
              },
            },
          },
        },
      },
    },
    name: "petstore",
  });
};

export const testRequest: ISerializedRequest = {
  headers: {},
  method: "get",
  path: "/v3",
  pathname: "/v3",
  host: "api.github.com",
  protocol: "https",
  query: {},
};

export const testResponse: ISerializedResponse = {
  headers: {},
  statusCode: 200,
  body: "OK",
};
