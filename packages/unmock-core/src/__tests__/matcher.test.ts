import fs from "fs";
import jsYaml from "js-yaml";
import path from "path";
import { ISerializedRequest } from "..";
import { OASMatcher } from "../service/matcher";

const petStoreYamlString: string = fs.readFileSync(
  path.join(__dirname, "__unmock__", "petstore", "spec.yaml"),
  "utf-8",
);

const schema = jsYaml.safeLoad(petStoreYamlString);

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
