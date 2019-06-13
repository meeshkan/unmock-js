import { httpRequestMatcherFactory } from "..";

const request = {
  hostname: "http://api.foo.com",
  method: "GET",
  pathname: "/v1/users",
};

describe("http request matcher", () => {
  it("returns undefined if no mocks are available", () => {
    const httpRequestMatcher = httpRequestMatcherFactory(() => []);
    const response = httpRequestMatcher(request);
    expect(response).toBeUndefined();
  });
});
