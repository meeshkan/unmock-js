import { defaultOptions, ignoreAuth, ignoreStory } from "../";
import { buildPath } from "../util";

test("build correct path", () => {
  expect(
    buildPath(
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
    ),
  ).toBe(
    // tslint:disable-next-line:max-line-length
    "/x/?story=%5B%5D&path=%2Fv1%2Fx&hostname=www.foo.com&method=GET&headers=%7B%22Authorization%22%3A%22Foo%22%2C%22User-Agent%22%3A%22Bar%22%7D&ignore=%22path%22&signature=my-signature",
  );
  expect(
    buildPath(
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
    ),
  ).toBe(
    // tslint:disable-next-line:max-line-length
    "/x/?story=%5B%5D&path=%2Fv1%2Fx&hostname=www.foo.com&method=GET&headers=%7B%22Authorization%22%3A%22Foo%22%2C%22User-Agent%22%3A%22Bar%22%7D&signature=my-signature",
  );
});

test("ignoreStory produces correct json", () => {
  expect(ignoreStory(defaultOptions)({})).toEqual({
    ...defaultOptions,
    ignore: [defaultOptions.ignore, "story"],
  });
  expect(ignoreStory(defaultOptions)()).toEqual({
    ...defaultOptions,
    ignore: [defaultOptions.ignore, "story"],
  });
  expect(ignoreStory(defaultOptions)({ whitelist: ["a"] })).toEqual({
    ...defaultOptions,
    ignore: [defaultOptions.ignore, "story"],
    whitelist: ["a"],
  });
  expect(ignoreStory(defaultOptions)({ ignore: {} })).toEqual({
    ...defaultOptions,
    ignore: [{}, "story"],
  });
});

test("ignoreAuth produces correct json", () => {
  expect(ignoreAuth(defaultOptions)({})).toEqual({
    ...defaultOptions,
    ignore: [defaultOptions.ignore, { headers: "Authorization" }],
  });
  expect(ignoreAuth(defaultOptions)()).toEqual({
    ...defaultOptions,
    ignore: [defaultOptions.ignore, { headers: "Authorization" }],
  });
  expect(ignoreAuth(defaultOptions)({ whitelist: ["a"] })).toEqual({
    ...defaultOptions,
    ignore: [defaultOptions.ignore, { headers: "Authorization" }],
    whitelist: ["a"],
  });
});
