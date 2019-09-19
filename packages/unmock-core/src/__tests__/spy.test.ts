import { assert, match } from "sinon";
import { ISerializedRequest, ISerializedResponse } from "../interfaces";
import { createCallTracker, ICallTracker } from "../service/spy";

const fakeRequest: ISerializedRequest = {
  method: "get",
  host: "github.com",
  protocol: "https",
  path: "/v3",
  pathname: "/v3",
  query: {},
};

const fakeResponse: ISerializedResponse = {
  statusCode: 200,
  body: JSON.stringify({ foo: "bar" }),
  headers: {
    "x-unmock-response": "foobar",
  },
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

describe("Decorated spy", () => {
  const req: ISerializedRequest = {
    method: "post",
    host: "github.com",
    protocol: "https",
    path: "/v3",
    pathname: "/v3",
    query: {},
    body: {
      hello: "foo",
    },
    headers: {
      "x-unmock": "bar",
    },
  };

  const res: ISerializedResponse = fakeResponse;

  describe("postRequestBody", () => {
    const callTracker: ICallTracker = createCallTracker();

    beforeEach(() => {
      callTracker.track({ req, res });
    });

    afterEach(() => {
      callTracker.reset();
    });

    it("should return request body when single one tracked", () => {
      expect(callTracker.spy.postRequestBody()).toBe(req.body);
    });
    it("should return request body when used with matching matcher", () => {
      expect(
        callTracker.spy.postRequestBody(match({ body: { hello: "foo" } })),
      ).toBe(req.body);
    });
    it("should throw when called with non-matching matcher", () => {
      const newCallTracker: ICallTracker = createCallTracker();
      newCallTracker.track({ req, res: fakeResponse });
      expect(() =>
        callTracker.spy.postRequestBody(match({ body: { hello: "bar" } })),
      ).toThrowError("postRequestBody: Expected");
    });
    it("should throw when nothing tracked", () => {
      expect(() => createCallTracker().spy.postRequestBody()).toThrowError(
        "postRequestBody: Expected",
      );
    });
    it("should throw when two matching calls tracked", () => {
      callTracker.track({ req, res: fakeResponse });
      expect(() => createCallTracker().spy.postRequestBody()).toThrowError(
        "postRequestBody: Expected",
      );
    });
  });

  describe("accessors", () => {
    const callTracker: ICallTracker = createCallTracker();
    beforeAll(() => {
      callTracker.track({ req, res });
    });

    it("should return response body", () => {
      expect(callTracker.spy.postResponseBody()).toBe(res.body);
    });

    it("should return request host", () => {
      expect(callTracker.spy.postRequestHost()).toBe(req.host);
    });
    it("should return request path", () => {
      expect(callTracker.spy.postRequestPath()).toBe(req.path);
    });
    it("should return request pathname", () => {
      expect(callTracker.spy.postRequestPathname()).toBe(req.pathname);
    });
    it("should return request protocol", () => {
      expect(callTracker.spy.postRequestProtocol()).toBe(req.protocol);
    });
    it("should return request headers", () => {
      expect(callTracker.spy.postRequestHeaders()).toEqual(req.headers);
    });
    it("should return response body", () => {
      expect(callTracker.spy.postResponseBody()).toEqual(res.body);
    });
    it("should return response headers", () => {
      expect(callTracker.spy.postResponseHeaders()).toEqual(res.headers);
    });
  });

  describe("withMethod", () => {
    it("should return one call when post request tracked", () => {
      const callTracker: ICallTracker = createCallTracker();
      callTracker.track({ req, res });
      expect(callTracker.spy.withMethod("post").callCount).toBe(1);
    });
    it("should not return calls for get when post request tracked", () => {
      const callTracker: ICallTracker = createCallTracker();
      callTracker.track({ req, res });
      expect(callTracker.spy.withMethod("get").callCount).toBe(0);
    });
  });
});
