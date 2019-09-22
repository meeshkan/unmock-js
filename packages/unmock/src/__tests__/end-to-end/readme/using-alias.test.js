const unmock = require("unmock");
const { u } = unmock;

unmock
  .nock("http://www.example.com", "foo")
  .get("/resource")
  .reply(200, u.integer());

unmock.default.associate("https://www2.example.com", "foo");

async function verifyReadme() {
  const result = await unmock.fetch("http://www.example.com/resource/");
  const text = await result.text();
  return parseInt(text);
}

beforeAll(() => unmock.default.on());
afterAll(() => unmock.default.off());

describe("verifyReadme", () => {
  it("makes sure the readme works", async () => {
    const res = await verifyReadme();
    expect(typeof res).toBe("number");
    expect(Math.floor(res)).toBe(res);
  });
});
