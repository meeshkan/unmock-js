import { ignoreAuth, ignoreStory, UnmockOptions } from "../";
import { DEFAULT_IGNORE_HEADER } from "../constants";
import { buildPath } from "../util";

const ignoreAuthTest = (inp?: any) => ignoreAuth()(inp);
const ignoreStoryTest = (inp?: any) => ignoreStory()(inp);

test("build correct path", () => {
  let opts = new UnmockOptions({ ignore: "path", signature: "my-signature" }); // Try with ignore
  let builtPath = buildPath(
    opts,
    { Authorization: "Foo", ["User-Agent"]: "Bar" },
    "www.foo.com",
    "GET",
    "/v1/x",
    [],
    true,
  );
  let url = new URL(`${opts.buildPath(builtPath)}`);
  let pathname = url.pathname;
  let searchParams = url.searchParams;
  expect(pathname).toBe("/x/");
  expect(searchParams.get("story")).toBe("[]");
  expect(searchParams.get("hostname")).toBe("www.foo.com");
  expect(searchParams.get("method")).toBe("GET");
  expect(searchParams.get("headers")).toBe(
    '{"Authorization":"Foo","User-Agent":"Bar"}',
  );
  expect(searchParams.get("path")).toBe("/v1/x");
  expect(searchParams.get("ignore")).toBe('"path"');
  expect(searchParams.get("signature")).toBe("my-signature");

  opts = new UnmockOptions({ signature: "my-signature", ignore: {} }); // Try again w/o ignore
  builtPath = buildPath(
    opts,
    { Authorization: "Foo", ["User-Agent"]: "Bar" },
    "www.foo.com",
    "GET",
    "/v1/x",
    [],
    true,
  );
  url = new URL(`${opts.buildPath(builtPath)}`);
  pathname = url.pathname;
  searchParams = url.searchParams;
  expect(pathname).toBe("/x/");
  expect(searchParams.get("story")).toBe("[]");
  expect(searchParams.get("hostname")).toBe("www.foo.com");
  expect(searchParams.get("method")).toBe("GET");
  expect(searchParams.get("headers")).toBe(
    '{"Authorization":"Foo","User-Agent":"Bar"}',
  );
  expect(searchParams.get("path")).toBe("/v1/x");
  expect(searchParams.get("ignore")).toBe(null);
  expect(searchParams.get("signature")).toBe("my-signature");
});

test("ignoreStory produces correct json", () => {
  expect(ignoreStoryTest().ignore).toEqual([DEFAULT_IGNORE_HEADER, "story"]);
  expect(ignoreStoryTest({}).ignore).toEqual([DEFAULT_IGNORE_HEADER, "story"]);
  const modifiedOpts = ignoreStoryTest({ whitelist: "a" });
  expect(modifiedOpts.ignore).toEqual([DEFAULT_IGNORE_HEADER, "story"]);
  expect(modifiedOpts.whitelist).toEqual([/^a$/]);
  expect(ignoreStoryTest({ ignore: [] }).ignore).toEqual(["story"]);
});

test("ignoreAuth produces correct json", () => {
  expect(ignoreAuthTest({}).ignore).toEqual([
    DEFAULT_IGNORE_HEADER,
    { headers: "Authorization" },
  ]);
  expect(ignoreAuthTest().ignore).toEqual([
    DEFAULT_IGNORE_HEADER,
    { headers: "Authorization" },
  ]);
  const opts = ignoreAuthTest({ whitelist: "a" });
  expect(opts.ignore).toEqual([
    DEFAULT_IGNORE_HEADER,
    { headers: "Authorization" },
  ]);
  expect(opts.whitelist).toEqual([/^a$/]);
});
