import { defaultOptions, ignoreAuth, ignoreStory } from "../dist";

test("ignoreStory produces correct json", () => {
  expect(ignoreStory({})).toEqual({
    ignore: [defaultOptions.ignore, "story"],
  });
  expect(ignoreStory()).toEqual({
    ...defaultOptions,
    ignore: [defaultOptions.ignore, "story"],
  });
  expect(ignoreStory({whitelist: ["a"]})).toEqual({
    ignore: [defaultOptions.ignore, "story"],
    whitelist: ["a"],
  });
  expect(ignoreStory({ ignore: {}})).toEqual({
    ignore: [{}, "story"],
  });
});

test("ignoreAuth produces correct json", () => {
  expect(ignoreAuth({})).toEqual({
    ignore: [defaultOptions.ignore, {headers: "Authorization"}],
  });
  expect(ignoreAuth()).toEqual({
    ...defaultOptions,
    ignore: [defaultOptions.ignore, {headers: "Authorization"}],
  });
  expect(ignoreAuth({whitelist: ["a"]})).toEqual({
    ignore: [defaultOptions.ignore, {headers: "Authorization"}],
    whitelist: ["a"],
  });
});
