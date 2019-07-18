import { OpenAPIObject } from "loas3/dist/src/generated/full";
import { stateStoreFactory } from "../service";
import { Service } from "../service/service";
import { ServiceStore } from "../service/serviceStore";

const schemaBase: OpenAPIObject = {
  openapi: "3.0.0",
  info: {
    version: "1.0.0",
    title: "Swagger Petstore",
    license: { name: "MIT" },
  },
  paths: {},
};

describe("Fluent API and Service instantiation tests", () => {
  // define some service populators that match IOASMappingGenerator type
  const PetStoreWithEmptyPaths = new ServiceStore([
    new Service({ schema: schemaBase, name: "petstore" }),
  ]);
  const PetStoreWithEmptyResponses = new ServiceStore([
    new Service({
      name: "petstore",
      schema: { ...schemaBase, paths: { "/pets": { get: { responses: {} } } } },
    }),
  ]);
  const PetStoreWithPseudoResponses = new ServiceStore([
    new Service({
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
    }),
  ]);

  it("Store with empty paths throws", () => {
    const store = stateStoreFactory(PetStoreWithEmptyPaths);
    expect(store.noservice).toThrow("Can't find specification");
    expect(store.petstore).toThrow("has no defined paths");
    expect(store.petstore.get).toThrow("has no defined paths");
  });

  it("Store with non-empty paths with non-matching method throws", () => {
    const store = stateStoreFactory(PetStoreWithEmptyResponses);
    expect(store.petstore.post).toThrow("Can't find any endpoints with method");
  });

  it("Store with existing path does not throw", () => {
    const store = stateStoreFactory(PetStoreWithPseudoResponses);
    store.petstore(); // Should pass
  });

  it("Store with REST method call does not throw", () => {
    const store = stateStoreFactory(PetStoreWithPseudoResponses);
    store.petstore.get(); // Should pass
  });

  it("Chaining multiple states without REST methods does not throw", () => {
    const store = stateStoreFactory(PetStoreWithPseudoResponses);
    store
      .petstore()
      .petstore()
      .petstore();
  });

  it("Chaining multiple states with REST methods does not throw", () => {
    const store = stateStoreFactory(PetStoreWithPseudoResponses);
    store.petstore
      .get()
      .petstore.get()
      .petstore();
  });

  it("Chaining multiple methods for a service does not throw", () => {
    const store = stateStoreFactory(PetStoreWithPseudoResponses);
    store.petstore
      .get()
      .get()
      .petstore();
  });
  it("Non HTTP methods are recognized as services and throws", () => {
    const store = stateStoreFactory(PetStoreWithPseudoResponses);
    expect(store.get).toThrow("Can't find specification");
    expect(store.petstore.get().boom).toThrow("Can't find specification");
  });

  it("Specifying missing endpoint without rest method throws", () => {
    const store = stateStoreFactory(PetStoreWithPseudoResponses);
    store.petstore("/pets"); // should pass
    expect(() => store.petstore("/pet")).toThrow("Can't find endpoint");
  });

  it("Specifying existing endpoint with rest method does not throw", () => {
    const store = stateStoreFactory(PetStoreWithPseudoResponses);
    store.petstore.get("/pets"); // should pass
  });

  it("Specifying missing endpoint with rest method throws", () => {
    const store = stateStoreFactory(PetStoreWithPseudoResponses);
    expect(() => store.petstore.post("/pets")).toThrow("Can't find response");
    expect(() => store.petstore.get("/pet")).toThrow("Can't find endpoint");
  });
});

describe("Test paths matching on serviceStore", () => {
  // tslint:disable: object-literal-sort-keys
  const petStoreParameters = {
    parameters: [
      {
        name: "petId",
        in: "path",
        required: true,
        description: "The id of the pet to retrieve",
        schema: { type: "string" },
      },
      {
        name: "test",
        in: "path",
      },
    ],
  };
  const DynamicPathsService = (
    params: any,
    ...additionalPathElement: string[]
  ) => {
    const path = `/pets/{petId}${additionalPathElement.join("/")}`;
    return new ServiceStore([
      new Service({
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
      }),
    ]);
  };

  it("Paths are converted to regexp", () => {
    const store = stateStoreFactory(DynamicPathsService(petStoreParameters));
    store.petstore("/pets/2"); // Should pass
    store.petstore("/pets/{petId}"); // should pass
    expect(() => store.petstore("/pet/2")).toThrow("Can't find endpoint");
    expect(() => store.petstore("/pets/")).toThrow("Can't find endpoint");
  });

  it("attempting to create a store with missing parameters throws", () => {
    expect(() => stateStoreFactory(DynamicPathsService({}))).toThrow(
      "no description for path parameters!",
    );
    expect(() =>
      stateStoreFactory(DynamicPathsService({ parameters: {} })),
    ).toThrow("no description for path parameters!");
  });

  it("attempting to create a store with partially missing parameters throws", () => {
    expect(() =>
      stateStoreFactory(
        DynamicPathsService(petStoreParameters, "/{boom}", "{foo}"),
      ),
    ).toThrow("following path parameters have not been described");
  });
});
