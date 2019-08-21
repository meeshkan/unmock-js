import { ISerializedRequest } from "..";
import { OASMatcher } from "../service/matcher";
import { PetStoreSchema as schema } from "./utils";

describe("OASMatcher", () => {
  describe("with petstore schema", () => {
    const matcher = new OASMatcher({ schema });
    const validRequest: ISerializedRequest = {
      host: "petstore.swagger.io",
      method: "GET",
      path: "/v1/pets",
      protocol: "http",
    };
    it("matches a correct request", () => {
      const sreq: ISerializedRequest = validRequest;
      const responseTemplate = matcher.matchToOperationObject(sreq);
      expect(responseTemplate).toBeDefined();
      expect(responseTemplate).toHaveProperty("operationId");
    });
    it("does not match the wrong host", () => {
      const sreq: ISerializedRequest = {
        ...validRequest,
        host: "pets.swagger.io",
      };
      const responseTemplate = matcher.matchToOperationObject(sreq);
      expect(responseTemplate).toBeUndefined();
    });
    it("does not match the wrong path", () => {
      const sreq: ISerializedRequest = {
        ...validRequest,
        path: "/v1",
      };
      const responseTemplate = matcher.matchToOperationObject(sreq);
      expect(responseTemplate).toBeUndefined();
    });
    it("does not match the wrong protocol", () => {
      const sreq: ISerializedRequest = {
        ...validRequest,
        protocol: "https",
      };
      const responseTemplate = matcher.matchToOperationObject(sreq);
      expect(responseTemplate).toBeUndefined();
    });
  });
});
