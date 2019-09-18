const unmockRequireDefault = require("../").default;
import unmockDefaultImport from "../";
import { sinon, UnmockRequest, UnmockResponse } from "../";

describe("Imports", () => {
  describe("with require", () => {
    it("should have expected properties for unmock", () => {
      expect(unmockRequireDefault).toBeDefined();
      expect(unmockRequireDefault).toHaveProperty("on");
    });
  });
  describe("with ES6 import", () => {
    it("should have expected properties for unmock", () => {
      expect(unmockDefaultImport).toBeDefined();
      expect(unmockDefaultImport).toHaveProperty("on");
    });
  });
  describe("for types", () => {
    it("should have UnmockRequest and UnmockResponse", () => {
      const request: UnmockRequest = {
        host: "github.com",
        method: "get",
        path: "/v1",
        pathname: "/v1",
        protocol: "http",
        query: {}
      };
      const response: UnmockResponse = { body: "asdf", statusCode: 200 };
      expect(request).toBeDefined();
      expect(response).toBeDefined();
    });
  });
  describe("for sinon", () => {
    it("should have assert and match", () => {
      const fooMatcher = sinon.match("foo");
      expect(fooMatcher.test("foo")).toBe(true);
      sinon.assert.match("foo", fooMatcher);
    });
  });
});
