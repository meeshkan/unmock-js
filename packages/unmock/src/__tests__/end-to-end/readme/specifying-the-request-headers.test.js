const unmock = require("unmock");
const { u } = unmock;

unmock
  .mock("http://www.example.com", {
    reqheaders: {
      authorization: "Basic Auth",
    },
  })
  .get("/")
  .reply(200, { foo: { bar: u.string() } });

async function verifyReadme(auth) {
  const result = await unmock.fetch("http://www.example.com", {
    method: "get",
    headers: { authorization: auth },
  });
  const json = await result.json();
  return json;
}

beforeAll(() => unmock.default.on());
afterAll(() => unmock.default.off());

describe("request header manipulations", () => {
  it("matches the request header correctly", async () => {
    const res = await verifyReadme("Basic Auth");
    expect(typeof res.foo.bar).toBe("string");
  });
  it("fails to match if a request header is off", async () => {
    await expect(verifyReadme(55)).rejects.toThrow();
  });
});
