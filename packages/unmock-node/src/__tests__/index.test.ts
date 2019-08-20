const unmockRequireDefault = require("../").default; // tslint:disable-line:no-var-requires
const dslRequire = require("../").dsl; // tslint:disable-line:no-var-requires
import unmockDefaultImport from "../";
import { dsl, UnmockRequest, UnmockResponse } from "../";

describe("Imports", () => {
  describe("with require", () => {
    it("should have expected properties for unmock", () => {
      expect(unmockRequireDefault).toBeDefined();
      expect(unmockRequireDefault).toHaveProperty("on");
    });
    it("should have expected properties for dsl object", () => {
      expect(dslRequire).toBeDefined();
    });
  });
  describe("with ES6 import", () => {
    it("should have expected properties for unmock", () => {
      expect(unmockDefaultImport).toBeDefined();
      expect(unmockDefaultImport).toHaveProperty("on");
    });
    it("should have expected properties for dsl object", () => {
      expect(dsl).toBeDefined();
      expect(dsl).toHaveProperty("textResponse");
    });
  });
  describe("for types", () => {
    it("should have UnmockRequest and UnmockResponse", () => {
      const request: UnmockRequest = {
        host: "github.com",
        method: "get",
        path: "/v1",
        protocol: "http",
      };
      const response: UnmockResponse = { body: "asdf", statusCode: 200 };
      expect(request).toBeDefined();
      expect(response).toBeDefined();
    });
  });
});
