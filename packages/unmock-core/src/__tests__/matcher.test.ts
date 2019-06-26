import fs from "fs";
import jsYaml from "js-yaml";
import path from "path";
import {
  IMockRequest,
  ISerializedRequest,
  ISerializedResponse,
} from "../interfaces";
import { httpRequestMatcherFactory, OASMatcher } from "../matcher";

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
  describe("with no available mocks", () => {
    it("returns undefined if no mocks are available", () => {
      const httpRequestMatcher = httpRequestMatcherFactory(() => []);
      const response = httpRequestMatcher(request);
      expect(response).toBeUndefined();
    });
  });

  describe("with literal mocks", () => {
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
  });

  describe("with a mock containing regexes", () => {
    it("returns the correct response for regex match", () => {
      const requestWithRegex: IMockRequest = {
        ...request,
        host: /.*foo\.com/,
      };
      const mocks = [{ request: requestWithRegex, response: mockResponse }];
      const httpRequestMatcher = httpRequestMatcherFactory(() => mocks);
      const matchedResponse = httpRequestMatcher(request);
      expect(matchedResponse).toEqual(mockResponse);
    });
    it("returns undefined for regex mismatch", () => {
      const requestWithRegex: IMockRequest = {
        ...request,
        host: /.*bar\.com/,
      };
      const mocks = [{ request: requestWithRegex, response: mockResponse }];
      const httpRequestMatcher = httpRequestMatcherFactory(() => mocks);
      const matchedResponse = httpRequestMatcher(request);
      expect(matchedResponse).toBeUndefined();
    });
  });

  describe("with a mock missing properties", () => {
    it("matches if mock is missing all properties", () => {
      const requestWithNoProperties: IMockRequest = {};
      const mocks = [
        { request: requestWithNoProperties, response: mockResponse },
      ];
      const httpRequestMatcher = httpRequestMatcherFactory(() => mocks);
      const matchedResponse = httpRequestMatcher(request);
      expect(matchedResponse).toEqual(mockResponse);
    });
  });
});

const petStoreYamlString: string = fs.readFileSync(
  path.join(__dirname, "__unmock__", "petstore", "spec.yaml"),
  "utf-8",
);

const schema = jsYaml.safeLoad(petStoreYamlString);

describe("OASMatcher", () => {
  it("matches a request to petstore", () => {
    const matcher = new OASMatcher({ schema });
    const sreq: ISerializedRequest = {
      host: "petstore.swagger.io",
      method: "GET",
      path: "/v1/pets",
      protocol: "http",
    };
    const responseTemplate = matcher.matchToResponseTemplate(sreq);
    expect(responseTemplate).toBeDefined();
  });
});
