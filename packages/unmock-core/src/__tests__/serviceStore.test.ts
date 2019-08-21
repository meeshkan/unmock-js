import {
  PetstoreServiceWithDynamicPaths,
  PetStoreServiceWithEmptyPaths,
  PetStoreServiceWithEmptyResponses,
  PetStoreServiceWithPseudoResponses,
} from "./utils";

import { ServiceStore } from "../service/serviceStore";

const PetStoreWithEmptyPaths = ServiceStore([PetStoreServiceWithEmptyPaths]);

const PetStoreWithEmptyResponses = ServiceStore([
  PetStoreServiceWithEmptyResponses,
]);

const PetStoreWithPseudoResponses = ServiceStore([
  PetStoreServiceWithPseudoResponses,
]);

const DynamicPathsService = (
  params: any,
  ...additionalPathElements: string[]
) =>
  ServiceStore([
    PetstoreServiceWithDynamicPaths(params, ...additionalPathElements),
  ]);

describe("Fluent API and Service instantiation tests", () => {
  it("Store with empty paths throws", () => {
    const store = PetStoreWithEmptyPaths;
    expect(() => store.noservice).toThrow("No service named 'noservice'");
    expect(() => store.petstore.state("boom")).toThrow("has no defined paths");
    expect(() => store.petstore.state.get("boom")).toThrow(
      "has no defined paths",
    );
  });

  it("Store with non-empty paths with non-matching method throws", () => {
    expect(() =>
      PetStoreWithEmptyResponses.petstore.state.post("boom"),
    ).toThrow("Can't find any endpoints with method");
  });

  it("Store with existing path does not throw", () => {
    PetStoreWithPseudoResponses.petstore.state({}); // Should pass
  });

  it("Store with REST method call does not throw", () => {
    PetStoreWithPseudoResponses.petstore.state.get({}); // Should pass
  });

  it("Chaining multiple states with REST methods does not throw", () => {
    PetStoreWithPseudoResponses.petstore.state.get({}).get({});
  });

  it("Non HTTP methods are recognized as services and throws", () => {
    const store = PetStoreWithPseudoResponses;
    expect(() => store.get).toThrow("No service named 'get'");
    // @ts-ignore
    expect(() => store.petstore.state.get({}).boom).toThrow(
      "what to do with 'boom'",
    );
  });

  it("Specifying missing endpoint without rest method throws", () => {
    const state = PetStoreWithPseudoResponses.petstore.state;
    state("/pets", {}); // should pass
    expect(() => state("/pet", {})).toThrow("Can't find endpoint");
  });

  it("Specifying existing endpoint with rest method does not throw", () => {
    PetStoreWithPseudoResponses.petstore.state.get("/pets", {}); // should pass
  });

  it("Specifying missing endpoint with rest method throws", () => {
    const state = PetStoreWithPseudoResponses.petstore.state;
    expect(() => state.post("/pets", {})).toThrow("Can't find response");
    expect(() => state.get("/pet", {})).toThrow("Can't find endpoint");
  });
});

describe("Test paths matching on serviceStore", () => {
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

  it("Paths are converted to regexp", () => {
    const petstore = DynamicPathsService(petStoreParameters).petstore;
    petstore.state("/pets/2", {}); // Should pass
    petstore.state("/pets/{petId}", {}); // should pass
    expect(() => petstore.state("/pet/2", {})).toThrow("Can't find endpoint");
    expect(() => petstore.state("/pets/", {})).toThrow("Can't find endpoint");
  });

  it("attempting to create a store with missing parameters throws", () => {
    expect(() => DynamicPathsService({})).toThrow(
      "no description for path parameters!",
    );
    expect(() => DynamicPathsService({ parameters: {} })).toThrow(
      "no description for path parameters!",
    );
  });

  it("attempting to create a store with partially missing parameters throws", () => {
    expect(() =>
      DynamicPathsService(petStoreParameters, "/{boom}", "{foo}"),
    ).toThrow("following path parameters have not been described");
  });
});
