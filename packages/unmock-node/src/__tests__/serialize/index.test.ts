import http, { IncomingMessage } from "http";
import https from "https";
import Mitm from "mitm";
import { serializeRequest } from "../../serialize";

describe("Request serializer", () => {
  let mitm: any;
  beforeEach(() => {
    mitm = Mitm();
  });
  afterEach(() => {
    mitm.disable();
  });

  test("serializes GET request", done => {
    const testHost = "example.org";

    mitm.on("request", async (req: IncomingMessage) => {
      const serializedRequest = await serializeRequest(req);
      expect(serializedRequest.host).toBe(testHost);
      expect(serializedRequest.method.toLowerCase()).toBe("get");
      expect(serializedRequest.path).toBe("/");
      expect(serializedRequest.protocol).toBe("http");
      expect(serializedRequest.body).toBeUndefined();
      done();
    });
    http.get(`http://${testHost}`);
  });

  function sendHttpsPostRequest(host: string, body: any) {
    const postHeaders = {
      "Content-Length": Buffer.byteLength(body, "utf8"),
      "Content-Type": "application/json",
    };

    const postOptions = {
      headers: postHeaders,
      host,
      method: "POST",
      path: "/",
      port: 443,
    };

    // do the POST call
    const postRequest = https.request(postOptions);

    // write the json data
    postRequest.write(body);
    postRequest.end();
  }

  test("serializes the body in POST request", done => {
    const testHost = "example.org";

    const message = "Hello post!";

    const body = JSON.stringify({
      message,
    });

    mitm.on("request", async (req: IncomingMessage) => {
      const serializedRequest = await serializeRequest(req);
      expect(serializedRequest.host).toBe(testHost);
      expect(serializedRequest.method.toLowerCase()).toBe("post");
      expect(serializedRequest.body).toEqual({ message });
      expect(serializedRequest.protocol).toBe("https");
      const requestHeaders = serializedRequest.headers;
      if (requestHeaders === undefined) {
        throw new Error("Request headers undefined");
      }
      expect(requestHeaders["content-type"]).toBe("application/json");
      expect(requestHeaders["content-length"]).toBe("25");
      expect(requestHeaders.host).toBe("example.org");
      done();
    });

    sendHttpsPostRequest(testHost, body);
  });
});
