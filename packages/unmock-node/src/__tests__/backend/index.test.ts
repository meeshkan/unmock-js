import axios from "axios";
import { IMock, UnmockOptions } from "unmock-core";
import NodeBackend from "../../backend";
import * as constants from "../../backend/constants";

describe("Node.js interceptor", () => {
  describe("with no mocks", () => {
    let nodeInterceptor: NodeBackend;
    beforeEach(() => {
      nodeInterceptor = new NodeBackend({ mockGenerator: () => [] });
      const unmockOptions = new UnmockOptions();
      nodeInterceptor.initialize(unmockOptions);
    });
    afterEach(() => {
      nodeInterceptor.reset();
    });
    test("returns an error if no mocks are available", async done => {
      try {
        await axios("http://example.org");
      } catch (err) {
        expect(err.response.status).toBe(501);
        expect(err.response.data).toBe(constants.MESSAGE_FOR_MISSING_MOCK);
        done();
      }
    });
  });
  describe("with a matching mock", () => {
    const responseBody = "something here";
    const mock: IMock = {
      request: {},
      response: {
        body: responseBody,
        headers: { "x-awesome": 300 },
        statusCode: 200,
      },
    };
    let nodeInterceptor: NodeBackend;
    beforeEach(() => {
      nodeInterceptor = new NodeBackend({ mockGenerator: () => [mock] });
      const unmockOptions = new UnmockOptions();
      nodeInterceptor.initialize(unmockOptions);
    });
    afterEach(() => {
      nodeInterceptor.reset();
    });

    test("returns the match if a matching mock is available", async () => {
      const response = await axios("http://example.org");
      const data = response.data;
      expect(data).toBeDefined();
      expect(data).toBe(responseBody);
      expect(response.headers["x-awesome"]).toBe("300");
    });
  });
});
