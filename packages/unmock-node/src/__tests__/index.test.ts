import http, { IncomingMessage } from "http";
import Mitm from "mitm";
import { serializeRequest } from "../serialize";

describe("Request serializer", () => {
  let mitm: any;
  beforeEach(() => {
    mitm = Mitm();
  });
  afterEach(() => {
    mitm.disable();
  });

  test("serializes request", done => {
    mitm.on("request", async (req: IncomingMessage) => {
      const serializedRequest = await serializeRequest(req);
      expect(serializedRequest.host).toBe("www.example.com");
      done();
    });
    http.get("www.example.com");
  });
});
