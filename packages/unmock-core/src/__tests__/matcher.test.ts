import { matcher } from "../generator";
import { OpenAPIObject } from "loas3/dist/generated/full";

const store: Record<string, OpenAPIObject> = {
  foo: {
    openapi: "",
    servers: [{ url: "https://api.foo.com" }],
    info: { title: "", version: "" },
    paths: {
      "/user": {
        get: { responses: { 200: { description: "userget" } } },
        post: { responses: { 200: { description: "userpost" } } },
        description: "",
      },
      "/user/{id}": {
        get: { responses: { 200: { description: "useridget" } } },
        post: { responses: { 201: { description: "useridpost" } } },
        description: "",
      },
      "/user/{id}/name": {
        get: { responses: { 200: { description: "useridnameget" } } },
        post: { responses: { 201: { description: "useridnamepost" } } },
        description: "",
      },
    },
  },
  bar: {
    openapi: "",
    servers: [{ url: "https://api.bar.com" }],
    info: { title: "", version: "" },
    paths: {
      "/guest": {
        get: { responses: { 200: { description: "guestget" } } },
        post: { responses: { 200: { description: "guestpost" } } },
        description: "",
      },
      "/guest/{id}": {
        get: { responses: { 200: { description: "guestidget" } } },
        post: { responses: { 201: { description: "guestidpost" } } },
        description: "",
      },
      "/guest/{id}/name": {
        get: { responses: { 200: { description: "guestidnameget" } } },
        post: { responses: { 201: { description: "guestidnamepost" } } },
        description: "",
      },
    },
  },
  baz: {
    openapi: "",
    servers: [{ url: "https://api.baz.com" }],
    info: { title: "", version: "" },
    paths: {
      "/guest": {
        parameters: [
          {
            in: "query",
            required: true,
            name: "hello",
            schema: { type: "string", pattern: "^[0-9]+$" },
          },
        ],
        get: { responses: { 200: { description: "guestget" } } },
        post: {
          parameters: [
            {
              in: "query",
              required: true,
              name: "thinking",
              schema: { type: "string" },
            },
          ],
          responses: { 200: { description: "guestpost" } },
        },
        description: "",
      },
      "/guest/{id}": {
        parameters: [
          {
            in: "query",
            required: true,
            name: "a",
            schema: { type: "string" },
          },
          {
            in: "query",
            required: true,
            name: "b",
            schema: { type: "string" },
          },
          {
            in: "query",
            name: "c",
            schema: { type: "string" },
          },
        ],
        get: { responses: { 200: { description: "guestidget" } } },
        post: {
          parameters: [
            {
              in: "header",
              required: true,
              name: "zz",
              schema: { type: "string" },
            },
            {
              in: "query",
              required: true,
              name: "zzz",
              schema: { type: "string" },
            },
            {
              in: "query",
              name: "c",
              schema: { type: "string" },
            },
          ],
          responses: { 201: { description: "guestidpost" } },
        },
        description: "",
      },
      "/guest/{id}/name": {
        get: { responses: { 200: { description: "guestidnameget" } } },
        post: {
          requestBody: {
            content: {
              ["application/json"]: {
                schema: {
                  type: "object",
                  required: ["age"],
                  properties: { age: { type: "integer" } },
                },
              },
            },
          },
          responses: { 201: { description: "guestidnamepost" } },
        },
        description: "",
      },
    },
  },
};

test("matcher matches correctly", () => {
  expect(
    matcher(
      {
        host: "api.foo.com",
        path: "/user",
        pathname: "/user",
        protocol: "https",
        method: "get",
        query: {},
      },
      store,
    ),
  ).toEqual({
    foo: {
      openapi: "",
      servers: [{ url: "https://api.foo.com" }],
      info: { title: "", version: "" },
      paths: {
        "/user": {
          get: { responses: { 200: { description: "userget" } } },
          description: "",
        },
      },
    },
  });
});

test("matcher matches correctly 2", () => {
  expect(
    matcher(
      {
        host: "api.bar.com",
        path: "/guest/{id}",
        pathname: "/guest/{id}",
        protocol: "https",
        method: "post",
        query: {},
      },
      store,
    ),
  ).toEqual({
    bar: {
      openapi: "",
      servers: [{ url: "https://api.bar.com" }],
      info: { title: "", version: "" },
      paths: {
        "/guest/{id}": {
          post: { responses: { 201: { description: "guestidpost" } } },
          description: "",
        },
      },
    },
  });
});

test("matcher discriminates paths correctly", () => {
  expect(
    matcher(
      {
        host: "api.foo.com",
        path: "/users", // incorrect, should be user
        pathname: "/users", // incorrect, should be user
        protocol: "https",
        method: "get",
        query: {},
      },
      store,
    ),
  ).toEqual({
    foo: {
      openapi: "",
      servers: [{ url: "https://api.foo.com" }],
      info: { title: "", version: "" },
      paths: {},
    },
  });
});

test("matcher discrimnates operation correctly", () => {
  expect(
    matcher(
      {
        host: "api.foo.com",
        path: "/user",
        pathname: "/user",
        protocol: "https",
        method: "delete", // does not exist
        query: {},
      },
      store,
    ),
  ).toEqual({
    foo: {
      openapi: "",
      servers: [{ url: "https://api.foo.com" }],
      info: { title: "", version: "" },
      paths: {
        "/user": {
          description: "",
        },
      },
    },
  });
});

test("matcher discrimnates bad service correctly", () => {
  expect(
    matcher(
      {
        host: "api.foo.commmm", // does not exist
        path: "/user",
        pathname: "/user",
        protocol: "https",
        method: "get",
        query: {},
      },
      store,
    ),
  ).toEqual({});
});

test("matcher discrimnates required query parameters when pattern matches", () => {
  expect(
    matcher(
      {
        host: "api.baz.com",
        path: "/guest",
        pathname: "/guest",
        protocol: "https",
        method: "get",
        query: { hello: "0" },
      },
      store,
    ).baz.paths["/guest"].get,
  ).toEqual(store.baz.paths["/guest"].get);
});

test("matcher discrimnates required query parameters when pattern does not match", () => {
  expect(
    matcher(
      {
        host: "api.baz.com",
        path: "/guest",
        pathname: "/guest",
        protocol: "https",
        method: "get",
        query: { hello: "b" },
      },
      store,
    ).baz.paths["/guest"].get,
  ).toEqual(undefined);
});

test("matcher discrimnates required query parameters when no query is present", () => {
  expect(
    matcher(
      {
        host: "api.baz.com",
        path: "/guest",
        pathname: "/guest",
        protocol: "https",
        method: "get",
        query: {},
      },
      store,
    ).baz.paths["/guest"].get,
  ).toEqual(undefined);
});

test("matcher discrimnates required post body correctly", () => {
  expect(
    matcher(
      {
        host: "api.baz.com",
        path: "/guest/3/name",
        pathname: "/guest/3/name",
        protocol: "https",
        method: "post",
        query: {},
        body: { age: 42 },
      },
      store,
    ).baz.paths["/guest/{id}/name"].post,
  ).toEqual(store.baz.paths["/guest/{id}/name"].post);
});

test("matcher discrimnates incorrect required post body correctly", () => {
  expect(
    matcher(
      {
        host: "api.baz.com",
        path: "/guest/3/name",
        pathname: "/guest/3/name",
        protocol: "https",
        method: "post",
        query: {},
        body: { age: "42" },
      },
      store,
    ).baz.paths["/guest/{id}/name"].post,
  ).toEqual(undefined);
});

test("matcher discrimnates required header and query correctly", () => {
  expect(
    matcher(
      {
        headers: { zz: "top" },
        host: "api.baz.com",
        path: "/guest/4",
        pathname: "/guest/4",
        protocol: "https",
        method: "post",
        query: { zzz: "aaa", a: "foo", b: "baz" },
      },
      store,
    ).baz.paths["/guest/{id}"].post,
  ).toEqual(store.baz.paths["/guest/{id}"].post);
});

test("matcher discrimnates missing required header correctly", () => {
  expect(
    matcher(
      {
        host: "api.baz.com",
        path: "/guest/4",
        pathname: "/guest/4",
        protocol: "https",
        method: "post",
        query: { zzz: "aaa", a: "foo", b: "baz" },
      },
      store,
    ).baz.paths["/guest/{id}"].post,
  ).toEqual(undefined);
});
