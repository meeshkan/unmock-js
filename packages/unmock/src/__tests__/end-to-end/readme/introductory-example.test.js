const unmock = require("unmock");
const { nock, transform, u } = unmock;
const { withCodes } = transform;
const runner = require("unmock-runner");

nock("https://zodiac.com", "zodiac")
  .get("/horoscope/{sign}")
  .reply(200, {
    horoscope: u.string(),
    ascendant: u.opt(u.string()),
  })
  .reply(404, { message: "Not authorized" });

async function getHoroscope(sign) {
  // use unmock.fetch, request, fetch, axios or any similar library
  const result = await unmock.fetch("https://zodiac.com/horoscope/" + sign);
  const json = await result.json();
  return { ...json, seen: false };
}

let zodiac;
beforeAll(() => {
  zodiac = unmock.default.on().services.zodiac;
});
afterAll(() => unmock.default.off());

const jestRunner = (fn, options) => async cb => {
  return runner(e => e.constructor.name === "JestAssertionError")(unmock)(
    meeshkanCallback => {
      const asJestCallback = () => {
        meeshkanCallback.success();
      };
      asJestCallback.fail = meeshkanCallback.fail;
      return fn ? fn(asJestCallback) : undefined;
    },
    options,
  )(cb ? { success: cb, fail: cb.fail } : undefined);
};

describe("getHoroscope", () => {
  it(
    "augments the API call with seen=false",
    jestRunner(async () => {
      zodiac.spy.resetHistory();
      zodiac.state(withCodes(200));
      const res = await getHoroscope();
      expect(res).toMatchObject(JSON.parse(zodiac.spy.getResponseBody()));
      expect(res.seen).toBe(false);
    }),
  );
});
