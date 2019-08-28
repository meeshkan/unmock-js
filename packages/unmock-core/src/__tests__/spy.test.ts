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
  describe("postRequestBody", () => {
    it("should return ", () => {
      const callTracker: ICallTracker = createCallTracker();
      callTracker.track({ req: postRequest, res: fakeResponse });
      expect(callTracker.spy.postRequestBody()).toBe(postRequest.body);
    });
    it("should throw when nothing tracked", () => {
      expect(() => createCallTracker().spy.postRequestBody()).toThrowError(
        "postRequestBody: Expected",
      );
    });
  });

  describe("withMethod", () => {
    it("should return one call when post request tracked", () => {
      const callTracker: ICallTracker = createCallTracker();
      callTracker.track({ req: postRequest, res: fakeResponse });
      expect(callTracker.spy.withMethod("post").callCount).toBe(1);
    });
    it("should not return calls for get when post request tracked", () => {
      const callTracker: ICallTracker = createCallTracker();
      callTracker.track({ req: postRequest, res: fakeResponse });
      expect(callTracker.spy.withMethod("get").callCount).toBe(0);
    });
  });
});
