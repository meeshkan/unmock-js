const unmock = require("unmock");
const { u } = unmock;

unmock
  .mock("http://www.example.com")
  .get("/?foo=bar")
  .reply(200, { baz: u.string() })
  .get("/hello")
  .query({ a: u.string() })
  .reply(200, u.array(u.number()));

async function verifyReadme0() {
  const result = await unmock.fetch("http://www.example.com?foo=bar");
  const json = await result.json();
  return json;
}

async function verifyReadme1() {
  await unmock.fetch("http://www.example.com");
}

async function verifyReadme2() {
  const result = await unmock.fetch("http://www.example.com/hello?a=x");
  const json = await result.json();
  return json;
}

async function verifyReadme3() {
  await unmock.fetch("http://www.example.com/hello?b=x");
}

beforeAll(() => unmock.default.on());
afterAll(() => unmock.default.off());

describe("request query manipulations", () => {
  it("matches the request query correctly", async () => {
    const res = await verifyReadme0();
    expect(typeof res.baz).toBe("string");
  });
  it("fails to match if a request query is off", async () => {
    await expect(verifyReadme1()).rejects.toThrow();
  });
  it("matches the request query correctly when query is specified in separate line", async () => {
    const res = await verifyReadme2();
    expect(res instanceof Array).toBe(true);
  });
  it("fails to match if a separated request query is off", async () => {
    await expect(verifyReadme3()).rejects.toThrow();
  });
});
