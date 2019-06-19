import { stateFactory } from "../state";

describe("State behaviour test suite", () => {
  // define some service populators that match IOASMappingGenerator type
  const NoPathsServicePopulator = () => ({ petstore: {} });
  const EmptyPathsServicePopulator = () => ({ petstore: { paths: {} } });
  const PetsPathsServicePopulator = () => ({
    petstore: { paths: { "/pets": { get: {} } } },
  });

  test("creating a state class", () => {
    const state = stateFactory(NoPathsServicePopulator);
    expect(state.noservice).toThrow("Can't find specification");
    expect(state.petstore).toThrow("has no defined paths");
  });

  test("state class with basic call to services", () => {
    const state = stateFactory(EmptyPathsServicePopulator);
    state.petstore(); // Should pass
  });

  test("state class with REST method calls to services", () => {
    const state = stateFactory(EmptyPathsServicePopulator);
    state.petstore.post(); // Should pass
  });

  test("Chaining multiple states without REST methods", () => {
    const state = stateFactory(EmptyPathsServicePopulator);
    state
      .petstore()
      .petstore()
      .petstore();
  });

  test("Chaining multiple states with REST methods", () => {
    const state = stateFactory(EmptyPathsServicePopulator);
    state.petstore
      .get()
      .petstore.post()
      .petstore();
  });

  test("Specifying endpoint without rest method", () => {
    const state = stateFactory(PetsPathsServicePopulator);
    state.petstore("/pets"); // should pass
    expect(() => state.petstore("/pet")).toThrow("Can't find endpoint");
  });

  test("Specifying endpoint with rest method", () => {
    const state = stateFactory(PetsPathsServicePopulator);
    state.petstore.get("/pets"); // should pass
    expect(() => state.petstore.post("/pets")).toThrow("Can't find response");
    expect(() => state.petstore.get("/pet")).toThrow("Can't find endpoint");
  });
});
