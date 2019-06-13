import {
  IMockRequest,
  ISerializedRequest,
  ISerializedResponse,
} from "../interfaces";
import { httpRequestMatcherFactory } from "../matcher";

const request: ISerializedRequest = {
  host: "api.foo.com",
  method: "GET",
  path: "/v1/users",
  protocol: "https",
};

const mockResponse: ISerializedResponse = {
  body: "",
  statusCode: 200,
};

describe("http request matcher", () => {
  it("returns undefined if no mocks are available", () => {
    const httpRequestMatcher = httpRequestMatcherFactory(() => []);
    const response = httpRequestMatcher(request);
    expect(response).toBeUndefined();
  });
  it("returns undefined if hostname does not match", () => {
    const requestWithDifferentHostname = {
      ...request,
      host: "bar.foo.com",
    };
    const mocks = [
      { request: requestWithDifferentHostname, response: mockResponse },
    ];
    const httpRequestMatcher = httpRequestMatcherFactory(() => mocks);
    const matchedResponse = httpRequestMatcher(request);
    expect(matchedResponse).toBeUndefined();
  });
  it("returns the correct response for exact match", () => {
    const requestCopy: ISerializedRequest = {
      ...request,
    };
    const mocks = [{ request: requestCopy, response: mockResponse }];
    const httpRequestMatcher = httpRequestMatcherFactory(() => mocks);
    const matchedResponse = httpRequestMatcher(request);
    expect(matchedResponse).toEqual(mockResponse);
  });
  it("returns the correct response for hostname regex match", () => {});
});
