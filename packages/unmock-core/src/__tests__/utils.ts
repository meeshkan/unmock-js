import * as fs from "fs";
import * as jsYaml from "js-yaml";
import * as path from "path";
import { Backend, IServiceDef, IServiceDefLoader } from "..";
import { IInterceptor } from "../interceptor";
import { ISerializedRequest, ISerializedResponse } from "../interfaces";
import { OpenAPIObject } from "../service/interfaces";
import { ServiceCore } from "../service/serviceCore";

export const testServiceDefLoader: IServiceDefLoader = {
  loadSync() {
    const petstoreDirectory = path.resolve(__dirname, "__unmock__", "petstore");

    const spec = fs
      .readFileSync(path.join(petstoreDirectory, "spec.yaml"))
      .toString("utf-8");

    const petstoreServiceDef: IServiceDef = {
      absolutePath: petstoreDirectory,
      directoryName: "petstore",
      serviceFiles: [{ basename: "spec.yaml", contents: spec }],
    };

    return [petstoreServiceDef];
  },
};

export const interceptorMock: IInterceptor = {
  disable: jest.fn(),
};

const TestInterceptor: () => jest.Mock<IInterceptor> = () =>
  jest.fn().mockReturnValue(interceptorMock);

export class TestBackend extends Backend {
  public constructor() {
    super({ interceptorFactory: TestInterceptor() });
  }
}

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
