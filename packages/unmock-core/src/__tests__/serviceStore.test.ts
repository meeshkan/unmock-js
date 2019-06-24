import { serviceStoreFactory } from "../service";

describe("State behaviour test suite", () => {
  // define some service populators that match IOASMappingGenerator type
  const NoPathsServicePopulator = () => ({ petstore: {} });
  const EmptyPathsServicePopulator = () => ({ petstore: { paths: {} } });
  const PetsPathsServicePopulator = () => ({
    petstore: { paths: { "/pets": { get: {} } } },
  });

  test("creating a state class", () => {
    const state = serviceStoreFactory(NoPathsServicePopulator);
    expect(state.noservice).toThrow("Can't find specification");
    expect(state.petstore).toThrow("has no defined paths");
  });

  test("state class with basic call to services", () => {
    const state = serviceStoreFactory(EmptyPathsServicePopulator);
    state.petstore(); // Should pass
  });

  test("state class with REST method calls to services", () => {
    const state = serviceStoreFactory(EmptyPathsServicePopulator);
    state.petstore.post(); // Should pass
  });

  test("Chaining multiple states without REST methods", () => {
    const state = serviceStoreFactory(EmptyPathsServicePopulator);
    state
      .petstore()
      .petstore()
      .petstore();
  });

  test("Chaining multiple states with REST methods", () => {
    const state = serviceStoreFactory(EmptyPathsServicePopulator);
    state.petstore
      .get()
      .petstore.post()
      .petstore();
  });

  test("Chaining multiple methods for a service", () => {
    const state = serviceStoreFactory(EmptyPathsServicePopulator);
    state.petstore
      .get()
      .post()
      .petstore();
    expect(state.get).toThrow("Can't find specification");
    expect(state.petstore.get().boom).toThrow("Can't find specification");
  });

  test("Specifying endpoint without rest method", () => {
    const state = serviceStoreFactory(PetsPathsServicePopulator);
    state.petstore("/pets"); // should pass
    expect(() => state.petstore("/pet")).toThrow("Can't find endpoint");
  });

  test("Specifying endpoint with rest method", () => {
    const state = serviceStoreFactory(PetsPathsServicePopulator);
    state.petstore.get("/pets"); // should pass
    expect(() => state.petstore.post("/pets")).toThrow("Can't find response");
    expect(() => state.petstore.get("/pet")).toThrow("Can't find endpoint");
  });
});

describe("Test paths matching on serviceStore", () => {
  // tslint:disable: object-literal-sort-keys
  const DynamicPathsServicePopulator = () => ({
    petstore: {
      paths: {
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
                schema: { type: "string" },
              },
            ],
            responses: {
              200: {
                description: "Expected response to a valid request",
                content: {
                  "application/json": {
                    schema: {
                      type: "array",
                      items: {
                        required: ["id", "name"],
                        properties: {
                          id: { type: "integer", format: "int64" },
                          name: { type: "string" },
                          tag: { type: "string" },
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
    },
  });

  test("Paths are converted to regexp", () => {
    const store = serviceStoreFactory(DynamicPathsServicePopulator);
  });
});
