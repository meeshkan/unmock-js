import axios from "axios";
import unmock, { nock, u } from "..";

const expectNServices = (expectedLength: number) =>
  expect(Object.keys(unmock.services).length).toEqual(expectedLength);

// @ts-ignore // we access private fields in this test for simplicity; it would probably be cleaner to have some of these as E2E tests
const getPrivateSchema = (name: string) => unmock.services[name].core.oasSchema;

describe("Tests dynamic path tests", () => {
  beforeEach(() => unmock.reloadServices());

  it("Adds a service", () => {
    expectNServices(0);
    unmock
      .nock("https://foo.com")
      .get("/foo")
      .reply(200, { foo: u.string() });
    expectNServices(1);
  });

  it("should add a service when used with named export", () => {
    expectNServices(0);
    nock("https://foo.com")
      .get("/foo")
      .reply(200, { foo: u.string() });
    expectNServices(1);
  });

  it("Adds a service and changes state", () => {
    expectNServices(0);
    unmock
      .nock("https://foo.com")
      .get("foo") // slash is prepended automatically
      .reply(200, { foo: u.string() });
    expectNServices(1);
    const service = unmock.services["foo.com"];
    if (service === undefined) {
      // type-checking mostly...
      throw new Error("Service was undefined??");
    }
  });

  it("Adds a service and updates it on consecutive calls", () => {
    expectNServices(0);
    unmock
      .nock("https://foo.com")
      .get("foo") // slash is prepended automatically
      .reply(200, { foo: u.string("address.city") });
    unmock
      .nock("https://foo.com")
      .post("/foo")
      .reply(201);
    expectNServices(1);
    const service = unmock.services["foo.com"];
    if (service === undefined) {
      // type-checking mostly...
      throw new Error("Service was undefined??");
    }
  });

  it("Adds a named service", () => {
    expectNServices(0);
    unmock
      .nock("https://abc.com", "foo")
      .get("abc") // slash is prepended automatically
      .reply(200, { foo: u.string() });
    expectNServices(1);
  });

  it("Chains multiple endpoints", () => {
    expectNServices(0);
    unmock
      .nock("https://abc.com", "foo")
      .get("abc") // slash is prepended automatically
      .reply(200, { foo: u.string() })
      .post("bar")
      .reply(404);
    expectNServices(1);
  });

  it("Chains multiple endpoints in multiple calls", () => {
    expectNServices(0);
    const dynamicSpec = unmock
      .nock("https://abc.com", "foo")
      .get("foo")
      .reply(200, { city: u.string("address.city") });
    dynamicSpec.get("foo").reply(404, { msg: u.string("address.city") });
    expectNServices(1);
  });

  it("Allows using same name with multiple servers", () => {
    expectNServices(0);
    unmock
      .nock("https://abc.com", "foo")
      .get("foo")
      .reply(200, { city: u.string("address.city") });
    unmock
      .nock("https://def.com", "foo")
      .get("foo")
      .reply(404, { msg: u.string("address.city") });
    unmock
      .nock("https://abc.com", "foo")
      .get("foo")
      .reply(500);
    expect(getPrivateSchema("foo").servers).toEqual([
      { url: "https://abc.com" },
      { url: "https://def.com" },
    ]);
  });

  it("Defines different responses on same endpoint and method", () => {
    expectNServices(0);
    unmock
      .nock("https://foo.com", "foo")
      .get("bar")
      .reply(200, { msg: u.string() })
      .reply(404, { msg: "Page not found!" });
    expect(
      Object.keys(getPrivateSchema("foo").paths["/bar"].get.responses),
    ).toEqual(["200", "404"]);
  });

  describe("Association works as expected", () => {
    it("Defines an empty service when nothing exists", () => {
      expectNServices(0);
      unmock.associate("https://foo.com", "foo");
      expectNServices(1);
      const schema = getPrivateSchema("foo");
      expect(Object.keys(schema.paths).length).toEqual(0);
      expect(schema.servers.length).toEqual(1);
    });

    it("Associates a service by url", () => {
      expectNServices(0);
      unmock
        .nock("https://www.foo.com")
        .get("")
        .reply(200);
      expect(unmock.services["www.foo.com"]).toBeDefined();
      expectNServices(1);
      unmock.associate("https://www.foo.com", "foo"); // rename the service
      expectNServices(1);
      expect(unmock.services.foo).toBeDefined();
      expect(unmock.services["www.foo.com"]).toBeUndefined();
    });

    it("Associates a url by name", () => {
      expectNServices(0);
      unmock
        .nock("https://www.foo.com", "foo")
        .get("")
        .reply(200);
      expect(unmock.services.foo).toBeDefined();
      expectNServices(1);
      unmock.associate("https://www.bar.com", "foo"); // add a server
      expectNServices(1);
      expect(unmock.services["www.foo.com"]).toBeUndefined();
      expect(unmock.services["www.bar.com"]).toBeUndefined();
      expect(getPrivateSchema("foo").servers).toEqual([
        { url: "https://www.bar.com" },
        { url: "https://www.foo.com" },
      ]);
    });

    it("A URL can be associated with multiple services", () => {
      expectNServices(0);
      unmock
        .nock("https://www.foo.com", "foo")
        .get("")
        .reply(200);
      unmock
        .nock("https://www.bar.com", "bar")
        .get("")
        .reply(200);
      expect(unmock.services.foo).toBeDefined();
      expect(unmock.services.bar).toBeDefined();
      expectNServices(2);
      unmock.associate("https://www.bar.com", "foo"); // add a server
      expect(getPrivateSchema("foo").servers).toEqual([
        { url: "https://www.bar.com" },
        { url: "https://www.foo.com" },
      ]);
      expect(getPrivateSchema("bar").servers).toEqual([
        { url: "https://www.bar.com" },
      ]);
    });

    it("A URL can be associated with multiple services and won't delete other services if they share name and URL", () => {
      expectNServices(0);
      unmock
        .nock("https://www.foo.com", "foo")
        .get("")
        .reply(200);
      unmock
        .nock("https://www.bar.com")
        .get("")
        .reply(200);
      expect(unmock.services.foo).toBeDefined();
      expect(unmock.services["www.bar.com"]).toBeDefined();
      expectNServices(2);
      unmock.associate("https://www.bar.com", "foo"); // add a server to foo
      expect(getPrivateSchema("foo").servers).toEqual([
        { url: "https://www.bar.com" },
        { url: "https://www.foo.com" },
      ]);
      expect(getPrivateSchema("www.bar.com").servers).toEqual([
        { url: "https://www.bar.com" },
      ]);
    });

    it("Can add to an existing service after call to associate", () => {
      expectNServices(0);
      unmock.associate("https://www.foo.com", "foo"); // empty service
      expectNServices(1);
      unmock
        .nock("https://www.foo.com", "foo")
        .get("")
        .reply(200);
      expectNServices(1);
      expect(Object.keys(getPrivateSchema("foo").paths).length).toEqual(1);
      unmock.associate("https://www.bar.com", "bar"); // empty service
      expectNServices(2);
      // since a name is not given, it cannot be associated with previously declared www.bar.com.
      unmock
        .nock("https://www.bar.com")
        .get("")
        .reply(200);
      expectNServices(3);
    });
  });

  describe("Paths can be defined using arrays and regexs", () => {
    it("An empty array of strings is equal to root path", () => {
      expectNServices(0);
      unmock
        .nock("https://www.foo.com", "foo")
        .get([])
        .reply(200);
      expectNServices(1);
      expect(Object.keys(getPrivateSchema("foo").paths)).toEqual(["/"]);
    });

    it("An array of strings is equal to the string of its parts", () => {
      expectNServices(0);
      unmock
        .nock("https://www.foo.com", "foo")
        .get(["foo", "foo", "foo"])
        .reply(200);
      expectNServices(1);
      expect(Object.keys(getPrivateSchema("foo").paths)).toEqual([
        "/foo/foo/foo",
      ]);
    });

    it("A simple regex is added as a parameter with randomly generated name", () => {
      expectNServices(0);
      unmock
        .nock("https://www.foo.com", "foo")
        .get(["foo", /\w+/, "bar"])
        .reply(200);
      expectNServices(1);
      const schema = getPrivateSchema("foo");
      expect(Object.keys(schema.paths).length).toEqual(1);
      const path = Object.keys(schema.paths)[0];
      expect(path).toMatch(/^\/foo\/\{[^}]+\}\/bar/);
      expect(schema.paths[path].parameters.length).toEqual(1);
      expect(path).toContain(schema.paths[path].parameters[0].name);
      expect(schema.paths[path].parameters[0].schema.pattern).toEqual(
        /\w+/.source,
      );
    });

    it("A regex is added as a parameter given name", () => {
      expectNServices(0);
      unmock
        .nock("https://www.foo.com", "foo")
        .get(["foo", ["baz", /\W+/], "bar"])
        .reply(200);
      expectNServices(1);
      const schema = getPrivateSchema("foo");
      expect(Object.keys(schema.paths).length).toEqual(1);
      const path = Object.keys(schema.paths)[0];
      expect(path).toEqual("/foo/{baz}/bar");
      expect(schema.paths[path].parameters.length).toEqual(1);
      expect(schema.paths[path].parameters[0].schema.pattern).toEqual(
        /\W+/.source,
      );
    });

    it("Also handles multiple parameters", async () => {
      expectNServices(0);
      unmock
        .nock("https://www.foo.com", "foo")
        .get(["foo", ["baz", /\W+/], "bar", /\d+/, ["spam", /eggs/]])
        .reply(200);
      expectNServices(1);
      const schema = getPrivateSchema("foo");
      expect(Object.keys(schema.paths).length).toEqual(1);
      const path = Object.keys(schema.paths)[0];
      expect(path).toMatch(/\/foo\/{baz}\/bar\/{\w+}\/{spam}/);
      const params = schema.paths[path].parameters;
      expect(params.length).toEqual(3);
      expect(params[0].schema.pattern).toEqual(/\W+/.source);
      expect(params[1].schema.pattern).toEqual(/\d+/.source);
      expect(params[2].schema.pattern).toEqual(/eggs/.source);
      // basic E2E test:
      unmock.on();
      const res = await axios("https://www.foo.com/foo/!@@!/bar/123/FeggsX");
      expect(res.status).toEqual(200);
      unmock.off();
    });
  });

  describe("queries can be specified", () => {
    it("An empty query results in a viable spec", () => {
      expectNServices(0);
      unmock
        .nock("https://www.foo.com", {}, "foo")
        .get("/")
        .query({})
        .reply(200);
      expectNServices(1);
      expect(Object.keys(getPrivateSchema("foo").paths)).toEqual(["/"]);
    });

    it("A query is correctly propagated", () => {
      expectNServices(0);
      unmock
        .nock("https://www.foo.com", "foo")
        .get("/")
        .query({ foo: "bar" })
        .reply(200);
      expectNServices(1);
      expect(getPrivateSchema("foo").paths["/"].parameters[0].in).toEqual(
        "query",
      );
      expect(getPrivateSchema("foo").paths["/"].parameters[0].name).toEqual(
        "foo",
      );
      expect(getPrivateSchema("foo").paths["/"].parameters[0].schema).toEqual({
        type: "string",
        enum: ["bar"],
      });
    });
    it("A query in the path correctly propagated", () => {
      expectNServices(0);
      unmock
        .nock("https://www.foo.com", "foo")
        .get("/?q&m=1&") // include an empty query
        .reply(200);
      expectNServices(1);
      expect(getPrivateSchema("foo").paths["/"].parameters[0].in).toEqual(
        "query",
      );
      expect(getPrivateSchema("foo").paths["/"].parameters[0].name).toEqual("");
      expect(getPrivateSchema("foo").paths["/"].parameters[0].schema).toEqual({
        type: "null",
      });
      expect(getPrivateSchema("foo").paths["/"].parameters[1].in).toEqual(
        "query",
      );
      expect(getPrivateSchema("foo").paths["/"].parameters[1].name).toEqual(
        "m",
      );
      expect(getPrivateSchema("foo").paths["/"].parameters[1].schema).toEqual({
        type: "string",
        enum: ["1"],
      });
    });
  });

  describe("Request headers can be specified", () => {
    it("An empty request header results in a viable spec", () => {
      expectNServices(0);
      unmock
        .nock("https://www.foo.com", {}, "foo")
        .get("/")
        .reply(200);
      expectNServices(1);
      expect(Object.keys(getPrivateSchema("foo").paths)).toEqual(["/"]);
    });

    it("A request header is correctly propagated", () => {
      expectNServices(0);
      unmock
        .nock("https://www.foo.com", { hello: "world" }, "foo")
        .get("/")
        .reply(200);
      expectNServices(1);
      expect(getPrivateSchema("foo").paths["/"].parameters[0].in).toEqual(
        "header",
      );
      expect(getPrivateSchema("foo").paths["/"].parameters[0].name).toEqual(
        "hello",
      );
      expect(getPrivateSchema("foo").paths["/"].parameters[0].schema).toEqual({
        type: "string",
        enum: ["world"],
      });
    });
  });

  describe("Reply headers can be specified", () => {
    it("An empty reply header results in a viable spec", () => {
      expectNServices(0);
      unmock
        .nock("https://www.foo.com", "foo")
        .get("/")
        .reply(200, "", {});
      expectNServices(1);
      expect(Object.keys(getPrivateSchema("foo").paths)).toEqual(["/"]);
    });

    it("A reply header is correctly propagated", () => {
      expectNServices(0);
      unmock
        .nock("https://www.foo.com", "foo")
        .get("/")
        .reply(200, "", { hello: "world" });
      expectNServices(1);
      expect(
        getPrivateSchema("foo").paths["/"].get.responses["200"].headers.hello
          .schema,
      ).toEqual({ type: "string", enum: ["world"] });
    });
  });
});
