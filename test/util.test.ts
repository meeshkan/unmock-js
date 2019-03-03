import { defaultOptions, ignoreAuth, ignoreStory } from "../dist";

test("ignoreStory produces correct json", () => {
  expect(ignoreStory({})).toEqual({
    ignore: ["story"],
  });
  expect(ignoreStory()).toEqual({
    ...defaultOptions,
    ignore: [defaultOptions.ignore, "story"],
  });
  expect(ignoreStory({whitelist: ["a"]})).toEqual({
    ignore: ["story"],
    whitelist: ["a"],
  });
});

test("ignoreAuth produces correct json", () => {
  expect(ignoreAuth({})).toEqual({
    ignore: [{headers: "Authorization"}],
  });
  expect(ignoreAuth()).toEqual({
    ...defaultOptions,
    ignore: [defaultOptions.ignore, {headers: "Authorization"}],
  });
  expect(ignoreAuth({whitelist: ["a"]})).toEqual({
    ignore: [{headers: "Authorization"}],
    whitelist: ["a"],
  });
});
