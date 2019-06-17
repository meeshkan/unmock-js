import axios from "axios";
import { UnmockOptions } from "unmock-core";
import NodeBackend from "../../backend";
import * as constants from "../../backend/constants";

describe("Node.js interceptor", () => {
  let nodeInterceptor: NodeBackend;
  beforeEach(() => {
    nodeInterceptor = new NodeBackend();
    const unmockOptions = new UnmockOptions();
    nodeInterceptor.initialize(unmockOptions);
  });
  afterEach(() => {
    nodeInterceptor.reset();
  });
  test("throws with an empty mock", async done => {
    try {
      await axios("http://example.org");
    } catch (err) {
      expect(err.response.status).toBe(501);
      expect(err.response.data).toBe(constants.MESSAGE_FOR_MISSING_MOCK);
      done();
    }
  });
});
