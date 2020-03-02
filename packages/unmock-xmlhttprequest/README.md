# unmock-xmlhttprequest

[![npm](https://img.shields.io/npm/v/unmock-xmlhttprequest.svg)](https://www.npmjs.com/package/unmock-xmlhttprequest)
[![CircleCI](https://circleci.com/gh/unmock/unmock-js.svg?style=svg)](https://circleci.com/gh/unmock/unmock-js)
[![codecov](https://codecov.io/gh/unmock/unmock-js/branch/dev/graph/badge.svg)](https://codecov.io/gh/unmock/unmock-js)
[![Known Vulnerabilities](https://snyk.io/test/github/unmock/unmock-js/badge.svg?targetFile=package.json)](https://snyk.io/test/github/unmock/unmock-js?targetFile=package.json)

Interceptor and faker for [xmlhttprequest](https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest_API).

## Installation

```bash
npm i -D unmock-xmlhttprequest
yarn add unmock-xmlhttprequest -D
```

## Usage

### Usage as monkey-patched `XMLHhttpRequest`

```ts
import { replaceOpenAndReturnOriginal } from "unmock-xmlhttprequest";
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
const originalOpen = replaceOpenAndReturnOriginal(responseCreator);

// Make API calls!
const request = new XMLHttpRequest();
request.open("GET", "https://example.com");
request.onload = () => {
  const asJson = JSON.parse(request.responseText);
  expect(asJson.ok).toBe(true);
}
request.send();
```
