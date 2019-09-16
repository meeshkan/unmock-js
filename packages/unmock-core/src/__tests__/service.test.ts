import { assert } from "sinon";
import {
  PetstoreServiceWithDynamicPaths,
  PetStoreServiceWithEmptyPaths,
  PetStoreServiceWithEmptyResponses,
  PetStoreServiceWithPseudoResponses,
  testRequest,
  testResponse,
} from "./utils";

import { Service } from "../service";
import { IRequestResponsePair } from "../service/spy";

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
});

describe("Service spy", () => {
  const service = new Service(PetStoreServiceWithEmptyPaths);
  const requestResponsePair: IRequestResponsePair = {
    req: testRequest,
    res: testResponse,
  };
  beforeEach(() => {
    service.reset();
  });
  it("should not be called after reset", () => {
    assert.notCalled(service.spy);
  });
  it("should be called once after one track", () => {
    PetStoreServiceWithEmptyPaths.track(requestResponsePair);
    assert.calledOnce(service.spy);
  });
  it("should be called with tracked request", () => {
    PetStoreServiceWithEmptyPaths.track(requestResponsePair);
    assert.calledWithExactly(service.spy, testRequest);
  });
  it("should have response as return value", () => {
    PetStoreServiceWithEmptyPaths.track(requestResponsePair);
    const trackedResponse = service.spy.firstCall.returnValue;
    expect(trackedResponse).toEqual(testResponse);
  });
});
