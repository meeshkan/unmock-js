import unmock, { u } from "..";

describe("Tests dynamic path tests", () => {
  beforeEach(() => unmock.reloadServices());

  it("Adds a service", () => {
    expect(Object.keys(unmock.services).length).toEqual(0); // Uses the default location and not the test folder
    unmock
      .nock("https://foo.com")
      .get("/foo")
      .reply(200, { foo: u.string() });
    expect(Object.keys(unmock.services).length).toEqual(1);
  });

  it("Adds a service and changes state", () => {
    expect(Object.keys(unmock.services).length).toEqual(0); // Uses the default location and not the test folder
    unmock
      .nock("https://foo.com")
      .get("foo") // slash is prepended automatically
      .reply(200, { foo: u.string() });
    expect(Object.keys(unmock.services).length).toEqual(1);
    const service = unmock.services["foo.com"];
    if (service === undefined) {
      // type-checking mostly...
      throw new Error("Service was undefined??");
    }
  });

  it("Adds a service and updates it on consecutive calls", () => {
    expect(Object.keys(unmock.services).length).toEqual(0); // Uses the default location and not the test folder
    unmock
      .nock("https://foo.com")
      .get("foo") // slash is prepended automatically
      .reply(200, { foo: u.string("address.city") });
    unmock
      .nock("https://foo.com")
      .post("/foo")
      .reply(201);
    expect(Object.keys(unmock.services).length).toEqual(1);
    const service = unmock.services["foo.com"];
    if (service === undefined) {
      // type-checking mostly...
      throw new Error("Service was undefined??");
    }
  });

  it("Adds a named service", () => {
    expect(Object.keys(unmock.services).length).toEqual(0); // Uses the default location and not the test folder
    unmock
      .nock("https://abc.com", "foo")
      .get("abc") // slash is prepended automatically
      .reply(200, { foo: u.string() });
    expect(Object.keys(unmock.services).length).toEqual(1);
  });

  it("Chains multiple endpoints", () => {
    expect(Object.keys(unmock.services).length).toEqual(0); // Uses the default location and not the test folder
    unmock
      .nock("https://abc.com", "foo")
      .get("abc") // slash is prepended automatically
      .reply(200, { foo: u.string() })
      .post("bar")
      .reply(404);
    expect(Object.keys(unmock.services).length).toEqual(1);
  });

  it("Chains multiple endpoints in multiple calls", () => {
    expect(Object.keys(unmock.services).length).toEqual(0); // Uses the default location and not the test folder
    const dynamicSpec = unmock
      .nock("https://abc.com", "foo")
      .get("foo")
      .reply(200, { city: u.string("address.city") });
    dynamicSpec.get("foo").reply(404, { msg: u.string("address.city") });
    expect(Object.keys(unmock.services).length).toEqual(1);
  });

  it("Allows using same name with multiple servers", () => {
    expect(Object.keys(unmock.services).length).toEqual(0); // Uses the default location and not the test folder
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
    // @ts-ignore // "private fields" heh...
    expect(unmock.services.foo.core.oasSchema.servers).toEqual([
      { url: "https://abc.com" },
      { url: "https://def.com" },
    ]);
  });

  it("Defines different responses on same endpoint and method", () => {
    expect(Object.keys(unmock.services).length).toEqual(0); // Uses the default location and not the test folder
    unmock
      .nock("https://foo.com", "foo")
      .get("bar")
      .reply(200, { msg: u.string() })
      .reply(404, { msg: "Page not found!" });
    expect(
      Object.keys(
        // @ts-ignore // "private fields" heh...
        unmock.services.foo.core.oasSchema.paths["/bar"].get.responses,
      ),
    ).toEqual(["200", "404"]);
  });
});
