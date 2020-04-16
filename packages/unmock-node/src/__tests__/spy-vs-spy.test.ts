import fetch from "node-fetch";
import { IService } from "unmock-core";
import unmock from "../";

unmock
  .mock("https://www.foo.com", { reqheaders: { hello: "world" } }, "foo")
  .get("/hello")
  .reply(200, { foo: "bar" }, { my: "header" })
  .post("/hello")
  .reply(200, { foo: "bar" }, { my: "header" })
  .put("/hello")
  .reply(200, { foo: "bar" }, { my: "header" })
  .delete("/hello")
  .reply(200, { foo: "bar" }, { my: "header" });

let foo: IService;
beforeAll(() => {
  foo = unmock.on().services.foo;
});
beforeEach(() => foo.reset());
afterAll(() => unmock.off());

describe("tests spies", () => {
  it("spies get attributes correctly", async () => {
    await fetch("https://www.foo.com/hello?alpha=omega", {
      headers: { hello: "world" },
    });
    const getRequestHeaders = foo.spy.getRequestHeaders();
    expect(getRequestHeaders && getRequestHeaders.hello).toBe("world");
    expect(foo.spy.getRequestPath()).toBe("/hello?alpha=omega");
    expect(foo.spy.getRequestPathname()).toBe("/hello");
    expect(foo.spy.getRequestProtocol()).toBe("https");
    expect(foo.spy.getRequestHost()).toBe("www.foo.com");
    expect(foo.spy.getRequestQuery()).toEqual({ alpha: "omega" });
    expect(foo.spy.getResponseCode()).toBe(200);
    const getResponseBody = foo.spy.getResponseBody();
    expect(JSON.parse(getResponseBody || "{}")).toEqual({ foo: "bar" });
    const getResponseHeaders = foo.spy.getResponseHeaders();
    expect(getResponseHeaders && getResponseHeaders.my).toBe("header");
  });
  it("spies delete attributes correctly", async () => {
    await fetch("https://www.foo.com/hello?alpha=omega", {
      method: "delete",
      headers: { hello: "world" },
    });
    const deleteRequestHeaders = foo.spy.deleteRequestHeaders();
    expect(deleteRequestHeaders && deleteRequestHeaders.hello).toBe("world");
    expect(foo.spy.deleteRequestPath()).toBe("/hello?alpha=omega");
    expect(foo.spy.deleteRequestPathname()).toBe("/hello");
    expect(foo.spy.deleteRequestProtocol()).toBe("https");
    expect(foo.spy.deleteRequestHost()).toBe("www.foo.com");
    expect(foo.spy.deleteRequestQuery()).toEqual({ alpha: "omega" });
    expect(foo.spy.deleteResponseCode()).toBe(200);
    const deleteResponseBody = foo.spy.deleteResponseBody();
    expect(JSON.parse(deleteResponseBody || "{}")).toEqual({ foo: "bar" });
    const deleteResponseHeaders = foo.spy.deleteResponseHeaders();
    expect(deleteResponseHeaders && deleteResponseHeaders.my).toBe("header");
  });
  it("spies put attributes correctly", async () => {
    await fetch("https://www.foo.com/hello?alpha=omega", {
      method: "put",
      body: JSON.stringify({ the: "end" }),
      headers: { "Content-Type": "application/json", hello: "world" },
    });
    const putRequestHeaders = foo.spy.putRequestHeaders();
    expect(putRequestHeaders && putRequestHeaders.hello).toBe("world");
    expect(foo.spy.putRequestPath()).toBe("/hello?alpha=omega");
    expect(foo.spy.putRequestPathname()).toBe("/hello");
    expect(foo.spy.putRequestProtocol()).toBe("https");
    const putRequestBody = foo.spy.putRequestBody();
    expect(JSON.parse(putRequestBody || "{}")).toEqual({ the: "end" });
    expect(foo.spy.putRequestBodyAsJson()).toEqual({ the: "end" });
    expect(foo.spy.putRequestHost()).toBe("www.foo.com");
    expect(foo.spy.putRequestQuery()).toEqual({ alpha: "omega" });
    expect(foo.spy.putResponseCode()).toBe(200);
    const putResponseBody = foo.spy.putResponseBody();
    expect(JSON.parse(putResponseBody || "{}")).toEqual({ foo: "bar" });
    expect(foo.spy.putResponseBodyAsJson()).toEqual({ foo: "bar" });
    const putResponseHeaders = foo.spy.putResponseHeaders();
    expect(putResponseHeaders && putResponseHeaders.my).toBe("header");
  });
  it("spies post attributes correctly", async () => {
    await fetch("https://www.foo.com/hello?alpha=omega", {
      method: "post",
      body: JSON.stringify({ the: "end" }),
      headers: { "Content-Type": "application/json", hello: "world" },
    });
    const postRequestHeaders = foo.spy.postRequestHeaders();
    expect(postRequestHeaders && postRequestHeaders.hello).toBe("world");
    expect(foo.spy.postRequestPath()).toBe("/hello?alpha=omega");
    expect(foo.spy.postRequestPathname()).toBe("/hello");
    expect(foo.spy.postRequestProtocol()).toBe("https");
    const postRequestBody = foo.spy.postRequestBody();
    expect(JSON.parse(postRequestBody || "{}")).toEqual({ the: "end" });
    expect(foo.spy.postRequestBodyAsJson()).toEqual({ the: "end" });
    expect(foo.spy.postRequestHost()).toBe("www.foo.com");
    expect(foo.spy.postRequestQuery()).toEqual({ alpha: "omega" });
    expect(foo.spy.postResponseCode()).toBe(200);
    const postResponseBody = foo.spy.postResponseBody();
    expect(JSON.parse(postResponseBody || "{}")).toEqual({ foo: "bar" });
    expect(foo.spy.postResponseBodyAsJson()).toEqual({ foo: "bar" });
    const postResponseHeaders = foo.spy.postResponseHeaders();
    expect(postResponseHeaders && postResponseHeaders.my).toBe("header");
  });
});
