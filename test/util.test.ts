import { defaultOptions, ignoreStory } from "../dist";

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
