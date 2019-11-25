import { ISerializedRequest } from "unmock-core";
import serialize from "../serialize";
import { Headers } from "../types";

describe("Fetch request serializer", () => {
  it("should serialize method correctly", () => {
    const req: ISerializedRequest = serialize("https://example.com", {
      method: "delete",
    });
    expect(req).toHaveProperty("method", "delete");
  });

  it.skip("should serialize a plain request URL", () => {
    const req: ISerializedRequest = serialize("https://example.com/v1?q=a");
    expect(req).toMatchObject({
      host: "example.com",
      path: "/v1?q=a",
      pathname: "/v1",
      query: { q: "a" },
      method: "get",
      protocol: "https",
    });
  });

  describe("header serialization", () => {
    it("should serialize a request with headers dictionary", () => {
      const headers = { "x-accept": "anything" };
      const req: ISerializedRequest = serialize("https://example.com", {
        headers,
      });
      expect(req).toMatchObject({
        headers,
      });
    });
    it("should normalize headers keys", () => {
      const headers = { "X-ACCEPT": "anything" };
      const req: ISerializedRequest = serialize("https://example.com", {
        headers,
      });
      expect(req).toMatchObject({
        headers: {
          "x-accept": "anything",
        },
      });
    });
    it("should serialize a request with headers object", () => {
      const headers = new Headers();
      headers.append("x-accept", "anything");
      const req: ISerializedRequest = serialize("https://example.com", {
        headers,
      });
      expect(req).toMatchObject({
        headers: {
          "x-accept": "anything",
        },
      });
    });
  });
});
