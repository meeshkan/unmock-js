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
