import http from "http";
import { UnmockOptions } from "unmock-core";
import NodeBackend from "../../backend";

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
  /*
  test("throws an error for a missing mock", done => {
    expect(() =>
      http.get(, res => {
        done();
      }),
    ).toThrow();
  });
  */

  test("returns 200", done => {
    http.get("http://example.org", res => {
      expect(res.statusCode).toBe(200);
      done();
    });
  });
});
