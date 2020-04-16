import {
  matchUrls,
  getPathItemWithMethod,
  matches,
  refName,
  firstElementOptional,
  keyLens,
  operationOptional,
  useIfHeader,
  identityGetter,
  hoistTransformer,
} from "../generator";
import { PathItem, OpenAPIObject } from "loas3/dist/generated/full";
import { some, none } from "fp-ts/lib/Option";
import { ISerializedRequest } from "../interfaces";

test("matchUrls returns all the urls from a schema's servers that match a given protocol and host", () => {
  expect(
    matchUrls("https", "api.foo.com", {
      openapi: "",
      paths: {},
      info: { title: "", version: "" },
      servers: [
        { url: "https://api.foo.commm/v2" },
        { url: "https://api.foo.com" },
      ],
    }),
  ).toEqual(["https://api.foo.com"]);
  expect(
    matchUrls("https", "api.foo.com", {
      openapi: "",
      paths: {},
      info: { title: "", version: "" },
      servers: [
        { url: "https://api.foo.commm/v2" },
        { url: "https://api.foo.com/v2/a/b/c" },
      ],
    }),
  ).toEqual(["https://api.foo.com/v2/a/b/c"]);

  expect(
    matchUrls("https", "api.foo.com/v2", {
      openapi: "",
      paths: {},
      info: { title: "", version: "" },
      servers: [
        { url: "https://api.foo.commm/v2" },
        { url: "https://api.foo.cooom/v2" },
      ],
    }).length,
  ).toEqual(0);
});

test("get path item with method keeps the path item we ask for and discards the rest", () => {
  const o: PathItem = {
    get: { responses: { 100: { description: "hello" } } },
    post: { responses: { 101: { description: "hello" } } },
    delete: { responses: { 102: { description: "hello" } } },
    description: "foo",
  };
  expect(getPathItemWithMethod("get", o)).toEqual({
    get: { responses: { 100: { description: "hello" } } },
    description: "foo",
  });
  expect(getPathItemWithMethod("post", o)).toEqual({
    post: { responses: { 101: { description: "hello" } } },
    description: "foo",
  });
});

test("path matcher takes string schema into account", () => {
  const bfoo = {
    parameters: [
      {
        in: "path",
        name: "foo",
        schema: { type: "string", pattern: "^[abc]+$" },
      },
    ],
  };
  const oai: OpenAPIObject = {
    openapi: "",
    info: { title: "", version: "" },
    paths: {
      "/b/{foo}": bfoo,
    },
  };
  expect(matches("/a/b", "/a/b", bfoo, "get", oai)).toBe(true);
  expect(matches("/a/", "/a/b", bfoo, "get", oai)).toBe(false);
  expect(matches("/a/b", "/a", bfoo, "get", oai)).toBe(false);
  expect(matches("/a/b/c", "/a/{fewfwef}/c", bfoo, "get", oai)).toBe(true);
  expect(matches("/b/ccaaca", "/b/{foo}", bfoo, "get", oai)).toBe(true);
  expect(matches("/b/ccaacda", "/b/{foo}", bfoo, "get", oai)).toBe(false);
});

test("firstElementOptional returns the first element of an array or none if the array is empty", () => {
  expect(firstElementOptional().getOption([1])).toEqual(some(1));
  expect(firstElementOptional().getOption([55, 2])).toEqual(some(55));
  expect(firstElementOptional().getOption([])).toEqual(none);
});

test("refName gets the name of a reference", () => {
  expect(refName({ $ref: "#/components/schemas/Foo" })).toBe("Foo");
});

test("keyLens provides a lens into the key of a [key, value] pair", () => {
  expect(keyLens().get([1, 2])).toBe(1);
});

test("operation optional gets a random operation from a path item", () => {
  expect(
    operationOptional.getOption({
      get: { responses: { 100: { description: "hello" } } },
      description: "foo",
    }),
  ).toEqual(some(["get", { responses: { 100: { description: "hello" } } }]));
  expect(
    operationOptional.getOption({
      description: "foo",
    }),
  ).toEqual(none);
});

const baseO: OpenAPIObject = {
  openapi: "hello",
  info: { title: "", version: "" },
  servers: [{ url: "https://hello.api.com" }],
  paths: {},
};

test("use if header only returns valid headers", () => {
  expect(useIfHeader(baseO, { name: "foo", in: "query" })).toEqual(none);
  expect(useIfHeader(baseO, { name: "foo", in: "header" })).toEqual(
    some(["foo", { type: "string" }]),
  );
  expect(
    useIfHeader(baseO, {
      name: "foo",
      in: "header",
      schema: { type: "number" },
    }),
  ).toEqual(some(["foo", { type: "number" }]));
  expect(
    useIfHeader(
      {
        ...baseO,
        components: { schemas: { Foo: { type: "boolean" } } },
      },
      {
        name: "foo",
        in: "header",
        schema: { $ref: "#/components/schemas/Foo" },
      },
    ),
  ).toEqual(some(["foo", { type: "boolean" }]));
});

test("identity getter gets whatever you give it as input", () => {
  expect(identityGetter().get(1)).toBe(1);
});

test("hoist transformer brings a transformer from OpenAPIObject to Record<string, OpenAPIObject>", () => {
  const foo = (_: ISerializedRequest, o: OpenAPIObject) => ({
    ...o,
    openapi: "foobar",
  });
  const hoisted = hoistTransformer(foo, "baseO");
  expect(
    hoisted(
      {
        host: "hello.api.com", // will match
        path: "/users",
        pathname: "/users",
        protocol: "https",
        method: "get",
        query: {},
        headers: {},
      },
      { baseO },
    ),
  ).toEqual({
    baseO: {
      ...baseO,
      openapi: "foobar",
    },
  });
  expect(
    hoisted(
      {
        host: "helloooooo.api.com", // will result in no-op
        path: "/users",
        pathname: "/users",
        protocol: "https",
        method: "get",
        query: {},
        headers: {},
      },
      { baseO },
    ),
  ).toEqual({ baseO });
});
