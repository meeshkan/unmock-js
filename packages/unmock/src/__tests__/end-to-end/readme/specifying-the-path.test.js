const unmock = require("unmock");
const { u } = unmock;

unmock
  .nock("http://www.example.com")
  .get("/resource/{id}")
  .reply(200, { hello: u.string() });

async function verifyReadme() {
  const result = await unmock.fetch("http://www.example.com/resource/5");
  const json = await result.json();
  return json;
}

beforeAll(() => unmock.default.on());
afterAll(() => unmock.default.off());

describe("verifyReadme", () => {
  it("makes sure the readme works", async () => {
    const res = await verifyReadme();
    expect(typeof res.hello).toBe("string");
  });
});
