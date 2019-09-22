import unmock, { fetch } from "../";
import { IService } from "../service";

unmock
  .nock("https://www.foo.com", { reqheaders: { hello: "world" } }, "foo")
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
})
beforeEach(() => foo.reset());
afterAll(() => unmock.off());

describe("tests spies", () => {
  it("spies get attributes correctly", async () => {
    await fetch("https://www.foo.com/hello?alpha=omega", {
      headers: { hello: "world" },
    });
    expect(foo.spy.getRequestHeaders().hello).toBe("world");
    expect(foo.spy.getRequestPath()).toBe("/hello?alpha=omega");
    expect(foo.spy.getRequestPathname()).toBe("/hello");
    expect(foo.spy.getRequestProtocol()).toBe("https");
    expect(foo.spy.getRequestHost()).toBe("www.foo.com");
    expect(foo.spy.getRequestQuery()).toEqual({alpha: "omega"});
    expect(foo.spy.getResponseCode()).toBe(200);
    expect(JSON.parse(foo.spy.getResponseBody())).toEqual({ foo: "bar"});
    expect(foo.spy.getResponseHeaders().my).toBe("header");
  });
  it("spies delete attributes correctly", async () => {
    await fetch("https://www.foo.com/hello?alpha=omega", {
      method: "delete",
      headers: { hello: "world" },
    });
    expect(foo.spy.deleteRequestHeaders().hello).toBe("world");
    expect(foo.spy.deleteRequestPath()).toBe("/hello?alpha=omega");
    expect(foo.spy.deleteRequestPathname()).toBe("/hello");
    expect(foo.spy.deleteRequestProtocol()).toBe("https");
    expect(foo.spy.deleteRequestHost()).toBe("www.foo.com");
    expect(foo.spy.deleteRequestQuery()).toEqual({alpha: "omega"});
    expect(foo.spy.deleteResponseCode()).toBe(200);
    expect(JSON.parse(foo.spy.deleteResponseBody())).toEqual({ foo: "bar"});
    expect(foo.spy.deleteResponseHeaders().my).toBe("header");
  });
  it("spies put attributes correctly", async () => {
    await fetch("https://www.foo.com/hello?alpha=omega", {
      method: "put",
      body: JSON.stringify({ the: "end" }),
      headers: { "Content-Type": "application/json", hello: "world" },
    });
    expect(foo.spy.putRequestHeaders().hello).toBe("world");
    expect(foo.spy.putRequestPath()).toBe("/hello?alpha=omega");
    expect(foo.spy.putRequestPathname()).toBe("/hello");
    expect(foo.spy.putRequestProtocol()).toBe("https");
    expect(foo.spy.putRequestBody()).toEqual({ the: "end"});
    expect(foo.spy.putRequestHost()).toBe("www.foo.com");
    expect(foo.spy.putRequestQuery()).toEqual({alpha: "omega"});
    expect(foo.spy.putResponseCode()).toBe(200);
    expect(JSON.parse(foo.spy.putResponseBody())).toEqual({ foo: "bar"});
    expect(foo.spy.putResponseHeaders().my).toBe("header");
  });
  it("spies post attributes correctly", async () => {
    await fetch("https://www.foo.com/hello?alpha=omega", {
      method: "post",
      body: JSON.stringify({ the: "end" }),
      headers: { "Content-Type": "application/json", hello: "world" },
    });
    expect(foo.spy.postRequestHeaders().hello).toBe("world");
    expect(foo.spy.postRequestPath()).toBe("/hello?alpha=omega");
    expect(foo.spy.postRequestPathname()).toBe("/hello");
    expect(foo.spy.postRequestProtocol()).toBe("https");
    expect(foo.spy.postRequestBody()).toEqual({ the: "end"});
    expect(foo.spy.postRequestHost()).toBe("www.foo.com");
    expect(foo.spy.postRequestQuery()).toEqual({alpha: "omega"});
    expect(foo.spy.postResponseCode()).toBe(200);
    expect(JSON.parse(foo.spy.postResponseBody())).toEqual({ foo: "bar"});
    expect(foo.spy.postResponseHeaders().my).toBe("header");
  });
});