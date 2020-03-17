const unmock = require("unmock");
const { u } = unmock;

unmock
  .mock("http://www.example.com")
  .post("/login", u.type({ token: u.string() }, { expires: u.integer() }))
  .reply(200, { id: u.string() });

async function verifyReadme(input) {
  const result = await unmock.fetch("http://www.example.com/login", {
    method: "post",
    body: JSON.stringify(input),
    headers: { "Content-Type": "application/json" },
  });
  const json = await result.json();
  return json;
}

beforeAll(() => unmock.default.on());
afterAll(() => unmock.default.off());

describe("request body manipulations", () => {
  it("matches the request body correctly", async () => {
    const res = await verifyReadme({ token: "hello" });
    expect(typeof res.id).toBe("string");
  });
  it("fails to match if a request body is off", async () => {
    await expect(verifyReadme({ token: 55 })).rejects.toThrow();
  });
});
