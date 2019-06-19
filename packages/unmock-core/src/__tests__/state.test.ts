import { stateFactory } from "../state";

describe("State proxy calls test suite", () => {
  test("creating a state class", () => {
    const state = stateFactory(() => ({ petstore: {} }));
    try {
      state.noservice();
      expect(true).toBeFalsy(); // should not reach here
    } catch (e) {
      expect(e.message).toContain("Can't find specification");
    }

    try {
      state.petstore(); // Should throw as there are no paths
      expect(true).toBeFalsy();
    } catch (e) {
      expect(e.message).toContain("has no defined paths");
    }
  });

  test("state class with basic call to services", () => {
    const state = stateFactory(() => ({ petstore: { paths: {} } }));
    state.petstore(); // Should pass
  });

  test("state class with REST method calls to services", () => {
    const state = stateFactory(() => ({ petstore: { paths: {} } }));
    state.petstore.post(); // Should pass
  });

  test("Chaining multiple states without REST methods", () => {
    const state = stateFactory(() => ({ petstore: { paths: {} } }));
    state
      .petstore()
      .petstore()
      .petstore();
  });

  test("Chaining multiple states with REST methods", () => {
    const state = stateFactory(() => ({ petstore: { paths: {} } }));
    state.petstore
      .get()
      .petstore.post()
      .petstore();
  });
});
