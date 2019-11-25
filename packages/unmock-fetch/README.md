# unmock-fetch

[![npm](https://img.shields.io/npm/v/unmock-fetch.svg)](https://www.npmjs.com/package/unmock-fetch)
[![CircleCI](https://circleci.com/gh/unmock/unmock-js.svg?style=svg)](https://circleci.com/gh/unmock/unmock-js)
[![codecov](https://codecov.io/gh/unmock/unmock-js/branch/dev/graph/badge.svg)](https://codecov.io/gh/unmock/unmock-js)
[![Known Vulnerabilities](https://snyk.io/test/github/unmock/unmock-js/badge.svg?targetFile=package.json)](https://snyk.io/test/github/unmock/unmock-js?targetFile=package.json)

Interceptor and faker for [fetch](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API).

## Installation

```bash
npm i -D unmock-fetch
yarn add unmock-fetch -D
```

## Usage

### Usage as fake `fetch`

```ts
import { buildFetch } from "unmock-fetch";
import { ISerializedRequest, ISerializedResponse, OnSerializedRequest } from "unmock-core";

// Define what to do with the intercepted request
const responseCreator = (
  req: ISerializedRequest
): ISerializedResponse => {
  return {
    headers: {},
    statusCode: 200,
    body: JSON.stringify({
      ok: true,
    }),
  };
};

// Build `fetch` with your callback
const fetch = buildFetch(responseCreator);

// Make API calls!
const response = await fetch("https://example.com");

const asJson = await response.json();

expect(asJson.ok).toBe(true);
```

### Usage as interceptor 

To override `global.fetch` or `window.fetch`, use the default import:

```ts
import FetchInterceptor from "unmock-fetch";

// What to do with serialized request
const requestCb: (
  req: ISerializedRequest
) => ISerializedResponse  = /* as above */

// Intercept `global.fetch` or `window.fetch`
FetchInterceptor.on(requestCb);

// Make API calls
const response = await fetch("https://example.com");

const asJson = await response.json();

expect(asJson.ok).toBe(true);

// Stop interceptor, restoring `global.fetch` or `window.fetch`
FetchInterceptor.off();
```
