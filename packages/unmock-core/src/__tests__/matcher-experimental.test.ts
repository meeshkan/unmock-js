import { matcher } from "../generator-experimental";
import { OpenAPIObject } from "loas3/dist/generated/full";

const store: Record<string, OpenAPIObject> = {
  foo: {
    openapi: "",
    servers: [ { url: "https://api.foo.com"}],
    info: { title: "", version: ""},
    paths: {
      "/user": {
        get: { responses: { 200: { description: "userget" }}},
        post: { responses: { 200: { description: "userpost" }}},
        description: "",
      },
      "/user/{id}": {
        get: { responses: { 200: { description: "useridget" }}},
        post: { responses: { 201: { description: "useridpost" }}},
        description: "",
      },
      "/user/{id}/name": {
        get: { responses: { 200: { description: "useridnameget" }}},
        post: { responses: { 201: { description: "useridnamepost" }}},
        description: "",
      },
    },
  },
  bar: {
    openapi: "",
    servers: [ { url: "https://api.bar.com"}],
    info: { title: "", version: ""},
    paths: {
      "/guest": {
        get: { responses: { 200: { description: "guestget" }}},
        post: { responses: { 200: { description: "guestpost" }}},
        description: "",
      },
      "/guest/{id}": {
        get: { responses: { 200: { description: "guestidget" }}},
        post: { responses: { 201: { description: "guestidpost" }}},
        description: "",
      },
      "/guest/{id}/name": {
        get: { responses: { 200: { description: "guestidnameget" }}},
        post: { responses: { 201: { description: "guestidnamepost" }}},
        description: "",
      },
    },
  },
};

test("matcher matches correctly", () => {
  expect(matcher({
    host: "api.foo.com",
    path: "/user",
    pathname: "/user",
    protocol: "https",
    method: "get",
    query: {},
   }, store)).toEqual({
    foo: {
      openapi: "",
      servers: [ { url: "https://api.foo.com"}],
      info: { title: "", version: ""},
      paths: {
        "/user": {
          get: { responses: { 200: { description: "userget" }}},
          description: "",
        },
      },
    },
  });
});

test("matcher matches correctly", () => {
  expect(matcher({
    host: "api.bar.com",
    path: "/guest/{id}",
    pathname: "/guest/{id}",
    protocol: "https",
    method: "post",
    query: {},
   }, store)).toEqual({
    bar: {
      openapi: "",
      servers: [ { url: "https://api.bar.com"}],
      info: { title: "", version: ""},
      paths: {
        "/guest/{id}": {
          post: { responses: { 201: { description: "guestidpost" }}},
          description: "",
        },
      },
    },
  });
});

test("matcher discriminates paths correctly", () => {
  expect(matcher({
    host: "api.foo.com",
    path: "/users", // incorrect, should be user
    pathname: "/users", // incorrect, should be user
    protocol: "https",
    method: "get",
    query: {},
   }, store)).toEqual({
    foo: {
      openapi: "",
      servers: [ { url: "https://api.foo.com"}],
      info: { title: "", version: ""},
      paths: {},
    },
  });
});

test("matcher discrimnates operation correctly", () => {
  expect(matcher({
    host: "api.foo.com",
    path: "/user",
    pathname: "/user",
    protocol: "https",
    method: "delete", // does not exist
    query: {},
   }, store)).toEqual({
    foo: {
      openapi: "",
      servers: [ { url: "https://api.foo.com"}],
      info: { title: "", version: ""},
      paths: {
        "/user": {
          description: "",
        },
      },
    },
  });
});

test("matcher discrimnates bad service correctly", () => {
  expect(matcher({
    host: "api.foo.commmm", // does not exist
    path: "/user",
    pathname: "/user",
    protocol: "https",
    method: "get",
    query: {},
   }, store)).toEqual({});
});
