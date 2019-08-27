import { UnmockRequest } from "..";
import { OASMatcher } from "../service/matcher";
import { PetStoreSchema as schema } from "./utils";

describe("OASMatcher", () => {
  describe("with petstore schema", () => {
    const matcher = new OASMatcher({ schema });
    const validRequest: UnmockRequest = {
      host: "petstore.swagger.io",
      method: "GET",
      path: "/v1/pets",
      protocol: "http",
    };
    it("matches a correct request", () => {
      const sreq: UnmockRequest = validRequest;
      const responseTemplate = matcher.matchToOperationObject(sreq);
      expect(responseTemplate).toBeDefined();
      expect(responseTemplate).toHaveProperty("operationId");
    });
    it("does not match the wrong host", () => {
      const sreq: UnmockRequest = {
        ...validRequest,
        host: "pets.swagger.io",
      };
      const responseTemplate = matcher.matchToOperationObject(sreq);
      expect(responseTemplate).toBeUndefined();
    });
    it("does not match the wrong path", () => {
      const sreq: UnmockRequest = {
        ...validRequest,
        path: "/v1",
      };
      const responseTemplate = matcher.matchToOperationObject(sreq);
      expect(responseTemplate).toBeUndefined();
    });
    it("does not match the wrong protocol", () => {
      const sreq: UnmockRequest = {
        ...validRequest,
        protocol: "https",
      };
      const responseTemplate = matcher.matchToOperationObject(sreq);
      expect(responseTemplate).toBeUndefined();
    });
  });
});
