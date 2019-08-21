import {
  PetstoreServiceWithDynamicPaths,
  PetStoreServiceWithEmptyPaths,
  PetStoreServiceWithEmptyResponses,
  PetStoreServiceWithPseudoResponses,
} from "./utils";

import { Service } from "../service";

const PetStoreWithEmptyPaths = new Service(PetStoreServiceWithEmptyPaths);

const PetStoreWithEmptyResponses = new Service(
  PetStoreServiceWithEmptyResponses,
);

const PetStoreWithPseudoResponses = new Service(
  PetStoreServiceWithPseudoResponses,
);

const DynamicPathsService = (
  params: any,
  ...additionalPathElements: string[]
) =>
  new Service(
    PetstoreServiceWithDynamicPaths(params, ...additionalPathElements),
  );

describe("Fluent API and Service instantiation tests", () => {
  it("setting a state for a service with empty paths throws", () => {
    const petstore = PetStoreWithEmptyPaths;
    expect(() => petstore.state("boom")).toThrow("has no defined paths");
    expect(() => petstore.state.get("boom")).toThrow("has no defined paths");
  });

  it("setting a state for a service with a non-existing method throws", () => {
    expect(() => PetStoreWithEmptyResponses.state.post("boom")).toThrow(
      "Can't find any endpoints with method",
    );
  });

  it("setting a state for a service with existing path does not throw", () => {
    PetStoreWithPseudoResponses.state({}); // Should pass
  });

  it("setting a state for a service with existing REST method does not throw", () => {
    PetStoreWithPseudoResponses.state.get({}); // Should pass
  });

  it("Chaining multiple states with REST methods does not throw", () => {
    PetStoreWithPseudoResponses.state.get({}).get({});
  });

  it("accessing rest methods on service throws", () => {
    // @ts-ignore
    expect(() => PetStoreWithPseudoResponses.get("foo")).toThrow(
      "not a function",
    );
  });
  it("using non REST method in a state chain throws", () => {
    // @ts-ignore
    expect(() => PetStoreWithPseudoResponses.state.get({}).boom).toThrow(
      "what to do with 'boom'",
    );
  });

  it("setting a state with missing endpoint and no REST method throws", () => {
    const state = PetStoreWithPseudoResponses.state;
    state("/pets", {}); // should pass
    expect(() => state("/pet", {})).toThrow("Can't find endpoint");
  });

  it("setting a state with existing endpoint and REST method does not throw", () => {
    PetStoreWithPseudoResponses.state.get("/pets", {}); // should pass
  });

  it("setting a state with missing endpoint and existing REST method throws", () => {
    const state = PetStoreWithPseudoResponses.state;
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
    const state = DynamicPathsService(petStoreParameters).state;
    state("/pets/2", {}); // Should pass
    state("/pets/{petId}", {}); // should pass
    expect(() => state("/pet/2", {})).toThrow("Can't find endpoint");
    expect(() => state("/pets/", {})).toThrow("Can't find endpoint");
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
