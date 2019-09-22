const unmock = require("unmock");
const { u } = unmock;

unmock
  .nock("http://www.example.com")
  .get(["users", /[0-9]+/, "status"]) // "/users/{id}/status"
  .reply(200, { hello: u.string() });

async function verifyReadme(input) {
  const result = await unmock.fetch(
    "http://www.example.com/users/" + input + "/status",
  );
  const json = await result.json();
  return json;
}

beforeAll(() => unmock.default.on());
afterAll(() => unmock.default.off());

describe("path manipulations", () => {
  it("uses a regexp correctly", async () => {
    const res = await verifyReadme(55);
    expect(typeof res.hello).toBe("string");
  });
  it("fails to match if regexp is off", async () => {
    await expect(verifyReadme("foo")).rejects.toThrow();
  });
});
