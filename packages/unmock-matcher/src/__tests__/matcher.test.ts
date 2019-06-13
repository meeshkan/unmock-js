import { ISerializedResponse } from "unmock-core";
import { httpRequestMatcherFactory } from "..";

const request = {
  hostname: "http://api.foo.com",
  method: "GET",
  pathname: "/v1/users",
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
      hostname: "https://bar.foo.com",
    };
    const mocks = [
      { request: requestWithDifferentHostname, response: mockResponse },
    ];
    const httpRequestMatcher = httpRequestMatcherFactory(() => mocks);
    const matchedResponse = httpRequestMatcher(request);
    expect(matchedResponse).toBeUndefined();
  });
  it("returns the correct response for exact match", () => {
    const requestCopy = {
      ...request,
    };
    const mocks = [{ request: requestCopy, response: mockResponse }];
    const httpRequestMatcher = httpRequestMatcherFactory(() => mocks);
    const matchedResponse = httpRequestMatcher(request);
    expect(matchedResponse).toEqual(mockResponse);
  });
});
