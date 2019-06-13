import { httpRequestMatcherFactory } from "..";

describe("http request matcher", () => {
  it("returns undefined for empty mocks", () => {
    const mocks = () => [];
    const httpRequestMatcher = httpRequestMatcherFactory(mocks);
    const request = {
      hostname: "http://api.foo.com",
    };
    const response = httpRequestMatcher(request);
    expect(response).toBeUndefined();
  });
});
