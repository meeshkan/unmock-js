import { ignoreAuth, ignoreStory, UnmockOptions } from "../";
import { DEFAULT_IGNORE_HEADER } from "../constants";
import { buildPath, endReporter } from "../util";

const ignoreAuthTest = (inp?: any) => ignoreAuth()(inp);
const ignoreStoryTest = (inp?: any) => ignoreStory()(inp);

test("end reporter reports end", () => {
  const opts = new UnmockOptions({ ignore: "path", signature: "my-signature" });
  const story: string[] = [];
  opts.persistence.saveMeta = jest.fn();
  opts.persistence.saveRequest = jest.fn();
  opts.persistence.saveResponse = jest.fn();
  opts.logger.log = jest.fn();
  endReporter(
    opts,
    "foo",
    story,
    false,
    {
      lang: "foobar",
    },
    {
      headers: { mike: "solomon" },
      host: "www.foo.com",
      path: "/bar/baz",
    },
    {
      body: "kimmo sääskilahti",
      headers: { idan: "tene" },
    },
  );
  expect((opts.logger.log as jest.Mock).mock.calls.length).toBe(3);
  expect((opts.logger.log as jest.Mock).mock.calls[0][0]).toBe(
    "*****url-called*****",
  );
  expect((opts.logger.log as jest.Mock).mock.calls[1][0]).toBe(
    "Hi! We see you've called undefined www.foo.com/bar/baz.",
  );
  expect((opts.logger.log as jest.Mock).mock.calls[2][0]).toBe(
    "We've sent you mock data back. You can edit your mock by typing the following command: unmock open foo",
  );
});

test("build correct path with ignore", () => {
  const opts = new UnmockOptions({ ignore: "path", signature: "my-signature" }); // Try with ignore
  const builtPath = buildPath(
    opts,
    { Authorization: "Foo", ["User-Agent"]: "Bar" },
    "www.foo.com",
    "GET",
    "/v1/x",
    [],
    true,
  );
  const url = new URL(`${opts.buildPath(builtPath)}`);
  const pathname = url.pathname;
  const searchParams = url.searchParams;
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
});
test("build correct path without ignore", () => {
  const opts = new UnmockOptions({ signature: "my-signature", ignore: {} }); // Try again w/o ignore
  const builtPath = buildPath(
    opts,
    { Authorization: "Foo", ["User-Agent"]: "Bar" },
    "www.foo.com",
    "GET",
    "/v1/x",
    [],
    true,
  );
  const url = new URL(`${opts.buildPath(builtPath)}`);
  const pathname = url.pathname;
  const searchParams = url.searchParams;
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
  expect(modifiedOpts.whitelist).toEqual("a");
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
  expect(opts.whitelist).toEqual("a");
});
