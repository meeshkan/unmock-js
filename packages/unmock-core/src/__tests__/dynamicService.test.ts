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
  });
});
