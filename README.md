# Unmock

[![npm](https://img.shields.io/npm/v/unmock.svg)][npmjs]
[![CircleCI](https://circleci.com/gh/unmock/unmock-js.svg?style=svg)](https://circleci.com/gh/unmock/unmock-js)
[![Known Vulnerabilities](https://snyk.io/test/github/unmock/unmock-js/badge.svg?targetFile=package.json)](https://snyk.io/test/github/unmock/unmock-js?targetFile=package.json)

[npmjs]: https://www.npmjs.com/package/unmock
[build]: https://circleci.com/gh/unmock/unmock-js
[coverage]: https://coveralls.io/github/unmock/unmock-js

Public API mocking for Node.js.

Unmock can be used to test modules that perform requests to third-party APIs like Hubspot, SendGrid, Behance, and hundreds of other public APIs.

Unmock can also be used to mock these APIs in a development environment, ie an express server on a local machine or in a staging environment.

Unmock is an isomorphic javascript package that can be used in Node or in the browser, including polyglot projects mixing the two (ie NextJS).

The ultimate goal of unmock is to provide a semantically and functionally adequate mock of the internet.

**Table of Contents**

<!-- toc -->

- [Unmock](#unmock)
  - [How does it work?](#how-does-it-work)
  - [Install](#install)
    - [Node version support](#node-version-support)
  - [Usage](#usage)
    - [Tests](#tests)
    - [Development](#development)
    - [Headless usage](#headless-usage)
    - [unmock.io](#unmockio)
    - [Saving mocks](#saving-mocks)
    - [Ignoring aspects of a mock](#ignoring-aspects-of-a-mock)
    - [Adding a signature](#adding-a-signature)
    - [Whitelisting API](#whitelisting-api)
    - [unmock.io tokens](#unmockio-tokens)
  - [Contributing](#contributing)
  - [License](#license)

<!-- tocstop -->

## How does it work?

Unmock works by overriding Node's `http.request` and `https.request` functions in addition to their `follow-redirect` versions, injecting JIT or persisted mocks of hundreds of APIs.

## Install

```sh
$ npm install --save unmock
```

### Node version support

The latest version of unmock supports all currently maintained Node versions, see [Node Release Schedule](https://github.com/nodejs/Release#release-schedule)

## Usage

### Tests

In your unit tests, you can invoke unmock like this:

```js
import { unmock } from "unmock";

beforeEach(async () => await unmock());

test("unmock mocks behance", {
  const { project } = await axios(`https://www.behance.net/v2/projects/5456?api_key=u_n_m_o_c_k_200`);
  expect(project.id).toBe(5456);
});
```

The above syntax uses jest, but the same is easily accomplishable in mocha, tape and most popular JS testing libraries.

Unmock will then either serve JIT semantically functionally correct mocks from its database or an empty JSON object for unmocked APIs that can be filled in by the user.  The address of these editable objects is printed to the command line during tests.

### Development

After you create your express, hapi, koa, nextjs or apollo server, call


```js
await unmock({ ignore: "story" }));
```

This has the same effect as activating unmock in your tests.  It will intercept http traffic and serve semantically and functionally adequate mocks of the APIs in the unmock catalogue.  The main difference is the `{ ignore: "story" }` object passed to unmock, which tells the service to ignore the order of mocked requests.  Always use this option when the order of mocked data does not matter, ie when you are in sandbox or development mode.  For users of the [unmock.io](https://www.unmock.io) service, this will help unmock better organize your mocks in its web dashboard.

### Headless usage

Unmock works out of the box for most APIs that it mocks and does not require any additional configuration.  For APIs that it does not mock yet, or to tweak return values from the unmock service, you can consult the URLs printed to the command line by unmock.

### unmock.io

The URLs printed to the command line are hosted by unmock.io.  You can consult the documentation about that service [here](https://www.unmock.io/docs).

### Saving mocks

All mocks can be saved to a folder called `.unmock` in your project's root directory by adding a `save` field to the unmock options object like so:

```js
await unmock({
  // ...
  save: "true",
  // ...
}));
```

Unmock refers to every mock by a unique hash.  Individual mocks or groups of mocks can be saved by setting save to either a single hash or an array of hashes like so:

```js
await unmock({
  // ...
  save: ["ahash", "anotherhash", "yetanotherhash"],
  // ...
}));
```

### Ignoring aspects of a mock

Sometimes, you would like for two mocks of slightly API calls to be treated as equivalent by unmock.  For example, you may want all `GET` calls to the same path with different headers to be served the same mock.  To do this, use the `ignore` field of the unmock options object.

```js
await unmock({
  // ...
  ignore: ["headers", "story"],
  // ...
}));
```

The following fields may be ignored:

* `headers`: the headers of the request
* `headers|regexp-field|regexp-value`: an individual, addressed by a regexp for both its field and value.  To permit all fields or all values, you need to specify the wildcard regexp (`*`) explicitly.
* `hostname`: the hostname of the request
* `method`: the method of the request (ie GET, POST, PUT, DELETE). Note that this is *case insensitive*!
* `path`: the path of the request
* `path|regexp`: paths matching a regular expression
* `story`: the story of the request, meaning its order in a series of requests

### Adding a signature

Sometimes, it is useful to sign a mock with a unique signature.  This is useful, for example, when AB testing code that should serve two different mocks for the same endpoint in otherwise similar conditions.  Do this, use the `signature` field of the unmock options object:

```js
await unmock({
  // ...
  signature: "signature-for-this-particular-test",
  // ...
}));
```

### Whitelisting API

If you do not want a particular API to be mocked, whitelist it.

```js
await unmock({
  // ...
  whitelist: ["api.hubspot.com", "api.typeform.com"],
  // ...
}));
```

### unmock.io tokens

If you are subscribed to the [unmock.io](https://www.unmock.io) service, you can pass your unmock token directly to the unmock object.

```js
await unmock({
  // ...
  token: "my-token",
  // ...
}));
```

At a certain point this becomes a bit tedious, at which point you will want to create a credentials file.  See [unmock.io/docs](https://wwunmock.io/docs) for more information on credential files.

## Contributing

Thanks for wanting to contribute! Take a look at our [Contributing Guide](CONTRIBUTING.md) for notes on our commit message conventions and how to run tests.

Please note that this project is released with a [Contributor Code of Conduct](CODE_OF_CONDUCT.md).
By participating in this project you agree to abide by its terms.

## License

[MIT](LICENSE)

Copyright (c) 2018–2019 [Meeshkan](http://meeshkan.com) and other [contributors](https://github.com/unmock/unmock/graphs/contributors).
