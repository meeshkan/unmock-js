const unmock = require("unmock");
const { nock, transform, u } = unmock;
const { withCodes } = transform;
const jestRunner = require("unmock-jest-runner")
  .default;

unmock
  .nock("http://www.foo.com")
  .get("/")
  // produces { firstName: "a random string", lastName: "another random string" }
  .reply(200, u.fuzz({ firstName: "Bob", lastName: "Smith" }));

async function getName(sign) {
  // use unmock.fetch, request, fetch, axios or any similar library
  const result = await unmock.fetch("http://www.foo.com");
  const json = await result.json();
  return json;
}

beforeAll(() => {
  zodiac = unmock.default.on();
});
afterAll(() => unmock.default.off());

describe("getName", () => {
  it(
    "gets fuzzed version of the name",
    jestRunner(async () => {
      const res = await getName();
      expect(typeof res.firstName).toBe("string");
      expect(typeof res.lastName).toBe("string");
      // there is a very, very slight chance this test
      // will fail if the random string generator
      // generates Bob or Smith
      expect(res.firstName).not.toBe("Bob");
      expect(res.lastName).not.toBe("Smith");
    }),
  );
});
