import { assert } from "sinon";
import { ISerializedRequest, ISerializedResponse } from "../interfaces";
import { createCallRecorder, IRecorder } from "../service/spy";

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
    const spyable: IRecorder = createCallRecorder();
    assert.notCalled(spyable.spy);
  });
  it("should record calls made via notify", () => {
    const spyable: IRecorder = createCallRecorder();
    spyable.record({ req: fakeRequest, res: fakeResponse });
    assert.calledOnce(spyable.spy);
    assert.calledWithExactly(spyable.spy, fakeRequest);
    expect(spyable.spy.firstCall.returnValue).toEqual(fakeResponse);
  });
  it("should be attachable to another object", () => {
    const spyable: IRecorder = createCallRecorder();
    const attached = { a: 1 };
    const objWithSpy = Object.assign(attached, spyable);
    objWithSpy.record({ req: fakeRequest, res: fakeResponse });
    assert.calledOnce(objWithSpy.spy);
    assert.calledWithExactly(objWithSpy.spy, fakeRequest);
    expect(objWithSpy.spy.firstCall.returnValue).toEqual(fakeResponse);
  });
});
