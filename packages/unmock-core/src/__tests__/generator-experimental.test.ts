import {
  matchUrls,
  prunePathItem,
  matches,
  refName,
  firstElementOptional,
  keyLens,
  operationOptional,
  useIfHeader,
  identityGetter,
  hoistTransformer
} from "../generator-experimental";
import { PathItem, OpenAPIObject } from "loas3/dist/generated/full";
import { some, none } from "fp-ts/lib/Option";
import { ISerializedRequest } from "../interfaces";

test("hasUrl works", () => {
  expect(matchUrls(
    "https",
    "api.foo.com",
    {
      openapi: "",
      paths: {},
      info: { title: "", version: "" },
      servers: [{ url: "https://api.foo.commm/v2" }, { url: "https://api.foo.com" }],
    },
  )).toEqual(["https://api.foo.com"]);
  expect(matchUrls(
    "https",
    "api.foo.com",
    {
      openapi: "",
      paths: {},
      info: { title: "", version: "" },
      servers: [{ url: "https://api.foo.commm/v2" }, { url: "https://api.foo.com/v2/a/b/c" }],
    },
  )).toEqual(["https://api.foo.com/v2/a/b/c"]);

  expect(matchUrls(
    "https",
    "api.foo.com/v2",
    {
      openapi: "",
      paths: {},
      info: { title: "", version: "" },
      servers: [{ url: "https://api.foo.commm/v2" }, { url: "https://api.foo.cooom/v2" }]
    },
  ).length).toEqual(0);
});

test("prune path item works", () => {
  const o: PathItem = {
    get: { responses: { 100: { description: "hello"} }},
    post: { responses: { 101: { description: "hello"} }},
    delete: { responses: { 102: { description: "hello"} }},
    description: "foo",
  };
  expect(prunePathItem("get", o)).toEqual(
    {
      get: { responses: { 100: { description: "hello"} }},
      description: "foo",
    },
  );
  expect(prunePathItem("post", o)).toEqual(
    {
      post: { responses: { 101: { description: "hello"} }},
      description: "foo",
    },
  );
});

test("matches works", () => {
  expect(matches("/a/b", "/a/b")).toBe(true);
  expect(matches("/a/", "/a/b")).toBe(false);
  expect(matches("/a/b", "/a")).toBe(false);
  expect(matches("/a/b/c", "/a/{fewfwef}/c")).toBe(true);
});

test("non empty prism works", () => {
  expect(firstElementOptional().getOption([1])).toEqual(some(1));
  expect(firstElementOptional().getOption([55, 2])).toEqual(some(55));
  expect(firstElementOptional().getOption([])).toEqual(none);
});

test("ref name works", () => {
  expect(refName({ $ref: "#/components/schemas/Foo"})).toBe("Foo");
});

test("key lens works", () => {
  expect(keyLens().get([1, 2])).toBe(1);
});

test("operation optional works", () => {
  expect(operationOptional.getOption({
    get: { responses: { 100: { description: "hello"} }},
    description: "foo",
  })).toEqual(some(["get", { responses: { 100: { description: "hello"} }}]));
  expect(operationOptional.getOption({
    description: "foo",
  })).toEqual(none);
});

const baseO: OpenAPIObject = {
  openapi: "hello",
  info: { title: "", version: ""},
  servers: [{url: "https://hello.api.com"}],
  paths: {},
};

test("use if header works", () => {
  expect(useIfHeader(baseO, { name: "foo", in: "query"})).toEqual(none);
  expect(useIfHeader(baseO, { name: "foo", in: "header"})).toEqual(some(["foo", {type: "string"}]));
  expect(useIfHeader(baseO, { name: "foo", in: "header", schema: { type: "number" }}))
    .toEqual(some(["foo", {type: "number"}]));
  expect(useIfHeader({
    ...baseO,
    components: { schemas: { Foo: { type: "boolean" }}},
  }, { name: "foo", in: "header", schema: { $ref: "#/components/schemas/Foo" }}))
    .toEqual(some(["foo", {type: "boolean"}]));
});

test("identity getter works", () => {
  expect(identityGetter().get(1)).toBe(1);
});

test("hoist transformer works", () => {
  const foo = (_: ISerializedRequest, o: OpenAPIObject) => ({ ...o, openapi: "foobar" });
  const hoisted = hoistTransformer(foo);
  expect(hoisted({
    host: "hello.api.com", // will match
    path: "/users",
    pathname: "/users",
    protocol: "https",
    method: "get",
    query: {},
   }, { baseO })).toEqual({
     baseO: {
        ...baseO,
        openapi: "foobar",
     },
  });
  expect(hoisted({
    host: "helloooooo.api.com", // will result in no-op
    path: "/users",
    pathname: "/users",
    protocol: "https",
    method: "get",
    query: {},
  }, { baseO })).toEqual({ baseO });
});
