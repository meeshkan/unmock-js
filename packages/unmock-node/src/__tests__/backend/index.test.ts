import axios from "axios";
import { IMock, UnmockOptions } from "unmock-core";
import NodeBackend from "../../backend";
import * as constants from "../../backend/constants";

describe("Node.js interceptor", () => {
  describe("with nothing in place yet", () => {
    let nodeInterceptor: NodeBackend;
    beforeEach(() => {
      nodeInterceptor = new NodeBackend();
      const unmockOptions = new UnmockOptions();
      nodeInterceptor.initialize(unmockOptions);
    });
    afterEach(() => {
      nodeInterceptor.reset();
    });
    test("gets successful response", async () => {
      const response = await axios("http://example.org");
      expect(response.status).toBe(200);
    });
  });
});
