import { assert } from "sinon";
import { ISerializedRequest, ISerializedResponse } from "../interfaces";
import { createCallTracker, ICallTracker } from "../service/spy";

const fakeRequest: ISerializedRequest = {
  method: "get",
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
    const callTracker: ICallTracker = createCallTracker();
    assert.notCalled(callTracker.spy);
  });
  it("should record calls made via notify", () => {
    const callTracker: ICallTracker = createCallTracker();
    callTracker.track({ req: fakeRequest, res: fakeResponse });
    assert.calledOnce(callTracker.spy);
    assert.calledWithExactly(callTracker.spy, fakeRequest);
    expect(callTracker.spy.firstCall.returnValue).toEqual(fakeResponse);
  });
});

const postRequest: ISerializedRequest = {
  method: "post",
  host: "github.com",
  protocol: "https",
  path: "/v3",
  body: {
    hello: "foo",
  },
};

describe("Decorated spy", () => {
  it("should have postRequestBody when tracked", () => {
    const callTracker: ICallTracker = createCallTracker();
    callTracker.track({ req: postRequest, res: fakeResponse });
    expect(callTracker.spy.postRequestBody()).toBe(postRequest.body);
  });
  it("should throw for postRequestBody when not tracked", () => {
    const callTracker: ICallTracker = createCallTracker();
    expect(() => callTracker.spy.postRequestBody()).toThrowError(
      "postRequestBody: Expected",
    );
  });
});
