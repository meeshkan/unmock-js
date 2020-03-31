# [Unmock](https://www.unmock.io/) (JavaScript SDK)

[![CircleCI](https://circleci.com/gh/meeshkan/unmock-js.svg?style=svg)](https://circleci.com/gh/meeshkan/unmock-js)
[![codecov](https://codecov.io/gh/unmock/unmock-js/branch/dev/graph/badge.svg)](https://codecov.io/gh/unmock/unmock-js)
[![Known Vulnerabilities](https://snyk.io/test/github/unmock/unmock-js/badge.svg?targetFile=package.json)](https://snyk.io/test/github/unmock/unmock-js?targetFile=package.json)
[![Chat on Gitter](https://badges.gitter.im/gitterHQ/gitter.png)](https://gitter.im/unmock/community)

Fuzz test your REST API calls.

* [Install](#install)
* [What Does Unmock Do](#what-does-unmock-do)
* [When To Use Unmock](#when-to-use-unmock)
* [The Docs](#the-docs)
* [Usage](#usage)
  + [Specifying hostname](#specifying-hostname)
  + [Specifying the path](#specifying-the-path)
  + [Specifying request body](#specifying-request-body)
  + [Specifying request query string](#specifying-request-query-string)
  + [Specifying Request Headers](#specifying-request-headers)
  + [Specifying replies](#specifying-replies)
  + [Specifying reply headers](#specifying-reply-headers)
  + [Chaining](#chaining)
  + [Ignorable API calls](#ignorable-api-calls)
* [Expectations](#expectations)
* [Initializing Mocks](#initializing-mocks)
* [Faker API](#faker-api)
* [Runner](#runner)
* [OpenAPI](#openapi)
* [Tutorials](#tutorials)
* [Contributing](#contributing)
* [Development](#development)
* [License](#license)

## Install

```sh
$ npm install --save-dev unmock
```

## What Does Unmock Do

Unmock helps you fuzz test REST API calls. Fuzz testing, or fuzzing, is a form of testing where you verify the correctness of code by asserting that it behaves correctly with variable and unexpected input. The response of a REST API is most often variable and unexpected. So, in most cases, fuzz testing is a useful way to test integrations with APIs.

## When To Use Unmock

Below are some questions to ask when determining if Unmock is a good fit for your development process.

- Is my code base in JavaScript or TypeScript?
- Does my code base have tests written in Jest, Mocha, Jasmine, Tap or Ava?
- Do I make a network call from my codebase to a REST API?

If the answer is yes to all of these questions, Unmock could help you test code paths in your code that make REST API calls and use the responses from those API.

## The Docs

If you don't like reading READMEs, check out our [docs](https://unmock.io/docs/introduction)!

## Usage

Here is a mock defined using unmock, a function to be tested, and a test written in jest. The commented numbers are explained in the text below this code example.

```js
const fetch = require("node-fetch");
const unmock = require("unmock");
const { runner, transform, u } = unmock;
const { withCodes } = transform;

unmock
  .mock("https://zodiac.com", "zodiac")
  .get("/horoscope/{sign}") // 1
  .reply(200, {
    horoscope: u.string(), // 2
    ascendant: u.opt(u.string()) // 3
  })
  .reply(404, { message: "Not authorized" }); // 4

async function getHoroscope(sign) {
  // use unmock.fetch, request, fetch, axios or any similar library
  const result = await fetch("https://zodiac.com/horoscope/" + sign);
  const json = await result.json();
  return { ...json, seen: false };
}

let zodiac;
beforeAll(() => {
  zodiac = unmock.default.on().services.zodiac;
});
afterAll(() => unmock.default.off());

describe("getHoroscope", () => {
  it(
    "augments the API call with seen=false",
    runner(async () => { // 5
      zodiac.state(withCodes(200)); // 6
      const res = await getHoroscope();
      expect(res).toMatchObject(JSON.parse(zodiac.spy.getResponseBody())); // 7
      expect(res.seen).toBe(false);
    }),
  );
});
```

With unmock, you can (1) override a REST endpoint to provide (2) variable and (3) optional responses in addition to (4) different status codes. Then, one uses the (5) runner to automatically run a test multiple times with subtly different responses from the API. One can also (6) initialize the API to a given state and (7) make assertions about how an API was used.

### Specifying hostname

The request hostname should be a string.

```js
unmock.mock('http://www.example.com')
  .get('/resource')
  .reply(200, u.integer())
```

Unmock will then refer to the service as `example`. To specify the name of the service as `foo`, we would write.

```js
unmock.mock('http://www.example.com', 'foo')
  .get('/resource')
  .reply(200, u.string())
```

To match multiple protocols or URLs, use `associate`.

```js
unmock.default.associate('https://www2.example.com', 'foo')
```

### Specifying the path

The request path should be a string, and you can use any [HTTP verb](#http-verbs). Wild-cards in the string should be enclosed in curly braces.

```js
unmock.mock('http://www.example.com')
  .get('/resource/{id}')
  .reply(200, u.string())
```

Alternatively, you can use an array of path segments, where each segment is either a string, a string in curly-braces for an open parameter, or a key/value pair associating a name of a path parameter to a regex matching it.

```js
unmock.mock('http://www.example.com')
  .get(["users", /[0-9]+/, "status"]) // "/users/{id}/status"
  .reply(200, u.string())
```

### Specifying request body

You can specify the request body to be matched as the second argument to the `get`, `post`, `put` or `delete` specifications. The argument can be any valid JSON, [`json-schema-poet`](https://github.com/unmock/json-schema-poet) using the `u` syntax(`u.integer()`, `u.string()`) or any combination thereof.

Here is an example of a post request that will only validate if it contains a token.

```js
unmock.mock('http://www.example.com')
  .post('/login', u.type({ token: u.string()}, {expires: u.integer()}))
  .reply(200, { id: u.string() })
```

> Unmock does not support body encodings other than "application/json" at this point.

### Specifying request query string

Unmock automatically ignores query strings. However, it understands query strings if you would like to match against them.

> When query strings are included in Unmock, they will act as if they are required. Most APIs do not have required query strings, so make sure to double-check the API documentation before indicating a required query string.

These parameters can be included as part of the path:

```js
unmock.mock('http://example.com')
  .get('/users?foo=bar')
  .reply(200)
```

Instead of placing the entire URL, you can specify the query part as an object:

```js
unmock.mock('http://example.com')
  .get('/users')
  .query({ name:u.string(), surname: u.string() })
  .reply(200, { results: u.array({id: u.integer() }) })
```

### Specifying Request Headers

You can specify the request headers like this:

```js
unmock.mock('http://www.example.com', {
  reqheaders: {
    authorization: 'Basic Auth',
  },
})
  .get('/')
  .reply(200)
```

Or you can use a regular expression to check the header values.

```js
unmock.mock('http://www.example.com', {
  reqheaders: {
    'X-My-Awesome-Header': /Awesome/i,
  },
})
  .get('/')
  .reply(200)
```

Headers in unmock are always a partial match, meaning that additional headers are ignored. This means that you don't need to worry about matching against common headers like `Content-Type` and `Host`.

### Specifying replies

You can specify the return status code for a path on the first argument of reply like this:

```js
unmock.mock('http://myapp.iriscouch.com')
  .get('/users/1')
  .reply(404)
```

You can also specify the reply body as valid JSON, `json-schema-poet`, or any combination thereof.

```js
unmock.mock('http://www.google.com')
  .get('/')
  .reply(200, u.stringEnum(['Hello from Google!', 'Do no evil']))
```

If you would like to transform any part of a constant reply (ie a fixture recorded from real API traffic) into a variable version of itself, use `u.fuzz`. This command infers the type of its input and produces output following the same schema.

```js
unmock.mock('http://www.foo.com')
  .get('/')
  // produces { firstName: "a random string", lastName: "another random string" }
  .reply(200, u.fuzz({ firstName: "Bob", lastName: "Smith" }))
```

### Specifying reply headers

You can specify the reply headers like this:

```js
unmock.mock('https://api.github.com')
  .get('/repos/atom/atom/license')
  .reply(200, { license: 'MIT' }, { 'X-RateLimit-Remaining': u.integer() })
```

### Chaining

You can chain behavior like this:

```js
unmock.mock('http://myapp.iriscouch.com')
  .get('/users/1')
  .reply(404)
  .post('/users', {
    username: u.string(),
    email: u.string(),
  })
  .reply(201, {
    ok: u.boolean(),
    id: u.string(),
    rev: u.string(),
  })
  .get('/users/123ABC')
  .reply(200, {
    _id: u.string(),
    _rev: u.string(),
    user: u.string(),
    name: u.string()
  })
```

### Ignorable API calls

For ignorable API calls where you are passing through information but don't care about a response, you can instruct unmock to serve random `200` responses to those requests using `tldr`.

```js
unmock
  .mock("https://my-analytics-api.vendor.com)
  .tldr();
```

## Expectations

Unmock uses [`sinon`](https://sinonjs.org) spies to help you compose (great) expectations.

> In general, try to write expectations using spies instead of hardcoded values. Instead of `expect(res).toEqual({foo: "bar", baz: true })`, favor `expect(res).toEqual({ ...spy.getRequestBody(), baz: true })`

Assuming you have defined a service using unmock, you can use spies following the `<verb><Request|Response><Thing>` convention. For example, `getResponseBody` or `deleteRequestPath`. Nonsensical things like `getRequsetBody` are not defined.

```js
test("analytics API was called", async () => {
  await myFunction()
  expect(analyticsService.spy.postRequestBody())
    .toMatchObject({ event: "VISITED" })
})
```

The following getter functions are defined on the spy object.

- `getRequestPathname`
- `getRequestPath`
- `getRequestHeaders`
- `getRequestQuery`
- `getRequestProtocol`
- `getResponseBody`
- `getResponseCode`
- `getResponseHeaders`
- `postRequestBody`
- `postRequestPathname`
- `postRequestPath`
- `postRequestHeaders`
- `postRequestQuery`
- `postRequestProtocol`
- `postResponseBody`
- `postResponseCode`
- `postResponseHeaders`
- `putRequestBody`
- `putRequestPathname`
- `putRequestPath`
- `putRequestHeaders`
- `putRequestQuery`
- `putRequestProtocol`
- `putResponseBody`
- `putResponseCode`
- `putResponseHeaders`
- `deleteRequestPathname`
- `deleteRequestPath`
- `deleteRequestHeaders`
- `deleteRequestQuery`
- `deleteRequestProtocol`
- `deleteResponseBody`
- `deleteResponseCode`
- `deleteResponseHeaders`

In addition, spies are full-fledged sinon spies. More about their usage in Unmock can be found [here](https://www.unmock.io/docs/expectations), and more information on sinon can be found [here](https://sinonjs.org/).

## Initializing Mocks

Unmock supports the initialization of services to arbitrary states. This is helpful, for example, if you want to test how your code behaves when a given service returns *exactly* five items or when a particiular field in an object is missing or present.

To do this, set the `state` property of a service. The state property is a function that takes a request and an OpenAPI schema as input and returns an OpenAPI schema and output.  Many utility functions have been created for the most common state manipulations. For example, to test the outcome with only certain codes, use `withCodes`.

```js
const unmock = require('unmock');
const withCodes = unmock.transform.withCodes;
const github = unmock.default.on().services.github;
github.state(withCodes([200, 201, 404]));
```

Because `withCodes` returns a function, the same thing could have been written.

```js
const unmock = require('unmock');
const withCodes = unmock.transform.withCodes;
const github = unmock.default.on().services.github;
github.state((req, schema) => withCodes([200, 201, 404])(req, schema));
```

This is useful, for example, if you want to test a certain code only if a given header is present.

```js
const unmock = require('unmock');
const withCodes = unmock.transform.withCodes;
const github = unmock.default.on().services.github;
github.state((req, schema) =>
  withCodes([200, ...(req.headers.MyHeader ? [404] : [])])(req, schema));
```

The unmock [documentation](https://www.unmock.io/docs/setting-state) contains more information about initializing the state.

## Faker API

`UnmockFaker` class provides a lower-level API for working with mocks. You can create a new `UnmockFaker` via `unmock.faker()`:

```ts
const unmock, { Service, ISerializedRequest} = require("unmock");
// import unmock from "unmock";  // ES6

const faker = unmock.faker();
```

To use the faker for mocking, you need to add services. The first option is to use the `nock` method:

```ts
faker
  .mock("http://petstore.swagger.io", "petstore")
  .get("/v1/pets")
  .reply(200, { foo: u.string() });
```

Alternatively, you can create a service from OpenAPI specification with `Service.fromOpenAPI`:

```ts
const { Service } = require("unmock");

const schema: OpenAPIObject = ...; // Load OpenAPIObject
const petstoreService = Service.fromOpenAPI({ schema, name: "petstore" })

// Add service to `faker`
faker.add(petstoreService);
```

You can then also modify the state of the petstore service via `state` property:

```ts
const { transform } = require("unmock");
// Service should always return code 200
petstore.state(transform.withCodes(200));
```

Once you have added a service, you can use `faker.generate` method to create a mock for any `Request` object:

```ts
const { UnmockRequest, UnmockResponse } = require("unmock");

const req: UnmockRequest = {
  host: "petstore.swagger.io",
  protocol: "http",
  method: "get",
  path: "/v1/pets",
  pathname: "/v1/pets",
  headers: {},
  query: {},
}

const res: UnmockResponse = faker.generate(req);

// Access res.statusCode, res.headers, res.body, etc.
expect(res.statusCode).toBe(200);
```

## Runner

The unmock runner runs the same test multiple times with different potential outcomes from the API. All of your unmock tests should use the `runner` unless you are absolutely certain that the API response will be the same every time.

```js
const { runner } = "unmock";
test("my API always works as expected", runner(async () => {
  const res = await myApiFunction();
  // some expectations
}));
```

## OpenAPI

Unmock supports the reading of OpenAPI specifications out of the box. Place your specification in a folder at the root of your project called `__unmock__/<myspecname>`, where `<myspecname>` is the name of the spec on the `unmock.on().services` object.  Several examples of this exist on the internet, most notably [here](https://github.com/unmock/unmock-examples/tree/master/using-service-repository).

## Tutorials

- [Unmock ts koans](https://github.com/meeshkan/unmock-ts-koans)
- [Unmock js katacoda](https://www.katacoda.com/unmock/scenarios/introduction)

## Contributing

Thanks for wanting to contribute! Take a look at our [Contributing Guide](CONTRIBUTING.md) for notes on our commit message conventions and how to run tests.

Please note that this project is governed by the [Meeshkan Community Code of Conduct](https://github.com/meeshkan/code-of-conduct). By participating in this project, you agree to abide by its terms.

## Development

- See [publish.md](./publish.md) for instructions how to make a new release

## License

[MIT](LICENSE)

Copyright (c) 2018–2019 [Meeshkan](http://meeshkan.com) and other [contributors](https://github.com/unmock/unmock-js/graphs/contributors).
