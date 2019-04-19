import { defaultOptions, ignoreAuth, ignoreStory } from "../dist";
import { buildPath } from "../dist/util";

test("build correct path", () => {
  expect(buildPath(
    { Authorization: "Foo", ["User-Agent"]: "Bar" },
    "www.foo.com",
    undefined,
    "path",
    "GET",
    "/v1/x",
    "my-signature",
    [],
    "api.unmock.io",
    true,
  // tslint:disable-next-line:max-line-length
  )).toBe("/x/?story=%5B%5D&path=%2Fv1%2Fx&hostname=www.foo.com&method=GET&headers=%7B%22Authorization%22%3A%22Foo%22%2C%22User-Agent%22%3A%22Bar%22%7D&ignore=%22path%22&signature=my-signature");
  expect(buildPath(
    { Authorization: "Foo", ["User-Agent"]: "Bar" },
    "www.foo.com",
    undefined,
    undefined,
    "GET",
    "/v1/x",
    "my-signature",
    [],
    "api.unmock.io",
    true,
  // tslint:disable-next-line:max-line-length
  )).toBe("/x/?story=%5B%5D&path=%2Fv1%2Fx&hostname=www.foo.com&method=GET&headers=%7B%22Authorization%22%3A%22Foo%22%2C%22User-Agent%22%3A%22Bar%22%7D&signature=my-signature");
});

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
