import { assert } from "sinon";
import { ISerializedRequest, ISerializedResponse } from "../interfaces";
import { createCallRecorder, ICallTracker } from "../service/spy";

const fakeRequest: ISerializedRequest = {
  method: "GET",
  host: "github.com",
  protocol: "https",
  path: "/v3",
};

const fakeResponse: ISerializedResponse = {
  statusCode: 200,
  body: JSON.stringify({ foo: "bar" }),
};

describe("Creating a spy", () => {
  it("should not be called after creation", () => {
    const spyable: ICallTracker = createCallRecorder();
    assert.notCalled(spyable.spy);
  });
  it("should record calls made via notify", () => {
    const callTracker: ICallTracker = createCallRecorder();
    callTracker.track({ req: fakeRequest, res: fakeResponse });
    assert.calledOnce(callTracker.spy);
    assert.calledWithExactly(callTracker.spy, fakeRequest);
    expect(callTracker.spy.firstCall.returnValue).toEqual(fakeResponse);
  });
});