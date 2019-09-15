import { without, hasUrl, prunePathItem, matches, refName, firstElementOptional, keyLens, getFirstMethod, operationOptional, useIfHeader, identityGetter } from "../generator-experimental";
import { Operation, PathItem, OpenAPIObject } from "loas3/dist/generated/full";
import { some, none } from "fp-ts/lib/Option";

interface ITest {
    a?: string;
    b?: string;
}

test("without correctly removes key", () => {
  const a: ITest = { a: "a", b: "b" };
  expect(without(a, "a")).toEqual({b: "b"});
});

test("hasUrl works", () => {
  expect(hasUrl(
    "https",
    "api.foo.com/v2", 
    {
      openapi: "",
      paths: {},
      info: { title: "", version: "" },
      servers: [{ url: "https://api.foo.commm/v2" }, { url: "https://api.foo.com/v2" }]
    },
  )).toBe(true);
  expect(hasUrl(
    "https",
    "api.foo.com/v2", 
    {
      openapi: "",
      paths: {},
      info: { title: "", version: "" },
      servers: [{ url: "https://api.foo.commm/v2" }, { url: "https://api.foo.cooom/v2" }]
    },
  )).toBe(false);
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
  openapi: "",
  info: { title: "", version: ""},
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
