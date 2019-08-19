import { assert } from "sinon";
import { ISerializedRequest, ISerializedResponse } from "../interfaces";
import { get } from "../service/spy";

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
    const testObj = get();
    assert.notCalled(testObj.spy);
  });
  it("should record calls", () => {
    const testObj = get();
    testObj.notify(fakeRequest, fakeResponse);
    assert.calledOnce(testObj.spy);
    assert.calledWithExactly(testObj.spy, fakeRequest);
    expect(testObj.spy.firstCall.returnValue).toEqual(fakeResponse);
  });
});
