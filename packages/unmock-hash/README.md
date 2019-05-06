# unmock-hash

[![npm](https://img.shields.io/npm/v/unmock-hash.svg)][npmjs]
[![CircleCI](https://circleci.com/gh/unmock/unmock-js.svg?style=svg)](https://circleci.com/gh/unmock/unmock-js)
[![codecov](https://codecov.io/gh/unmock/unmock-js/branch/dev/graph/badge.svg)](https://codecov.io/gh/unmock/unmock-js)
[![Known Vulnerabilities](https://snyk.io/test/github/unmock/unmock-js/badge.svg?targetFile=package.json)](https://snyk.io/test/github/unmock/unmock-js?targetFile=package.json)

[npmjs]: https://www.npmjs.com/package/unmock
[build]: https://circleci.com/gh/unmock/unmock-js
[coverage]: https://coveralls.io/github/unmock/unmock-js

Node JS reference implementation of the unmock hash function.

## Versions

### v0

The hash function combines together seven required parameters and one optional parameter in order to give every mock created by unmock a unique hash.  The hash function is the primary means of determining that two mocks are intended to be the same.

#### Parameters

Below is the typescript specification for the parameters of the v0 hash function.

```ts
{
  body: string | {};
  headers: IStringMap;
  hostname: string;
  method: string;
  path: string;
  story: string[];
  user_id: string;
  signature?: string;
}
```

| Name      | Description |
| --------- | ----------- |
| body      | The body of the incoming request, represented as a string. A non-existent body is represented by an empty object |
| headers   | The headers of the incoming request, represented as a dictionary of strings. Note that, unless otherwise requested (see below), header keys are **case sensitive**. |
| hostname  | The host of the incoming request, ie `www.example.com` or `api.foo.com`. |
| method    | The method.  Note that the method, unlike header keys, is *always* case invariant, meaning that `GET` is the same as `get`. |
| path      | The path of the request, ie `/api/v2/foo`. |
| story     | An array of unmock requests that precede this one, ordered from most to least recent.  For example, `["a835de14", "bfa619cc"]` means that a mock with hash `"a835de14"` came directly before the current one, and `"bfa619cc"` before that.   |
| user_id   | The user_id used when interacting with `unmock.io`. This is always checked against the server when authenticated.  As a convention, the unauthenticated user name is always called `"MOSES"`.|
| signature | An optional string used to sign requests.  This allows two requests that are otherwise exactly the same to be differentiated by the user. Can be anything, but in general, it should be something difficult to guess. |

#### Ignore

The hash function can ignore certain parameters when generating a hash, allowing for two objects to be considered similar.  This is especially useful when dealing with URLs that need to resolve to the same hash in spite of minor differences.  For example, all post requests to a given path can be conflated by setting ignore to:

```ts
["story", { headers: "Content-Length" }, "body"]
```

This means that the body, the length of the body, and what preceded the request will be disregarded when making the hash.  However, on the other hand, if the `POST` changes to `GET`, this will be picked up by the hash function.

The ignore object is expressed in typescript as such:

```ts

export interface IIgnoreObjectV0 {
  [key: string]: string | undefined | string[] | IStringMap;
  body?: string;
  headers?: string | string[] | IStringMap;
  hostname?: string;
  method?: string;
  path?: string;
  story?: string | string[];
  user_id?: string;
  signature?: string;
}

type IgnoreFieldV0 =
  | "body"
  | "headers"
  | "hostname"
  | "method"
  | "path"
  | "story"
  | "user_id"
  | "signature";
type SingleIgnoreV0 = IIgnoreObjectV0 | IgnoreFieldV0;
type IgnoreV0 = SingleIgnoreV0 | SingleIgnoreV0[];
```

This means that ignore can be a single string, ie `headers`, in which case the headers can be ignored.  It can also be a an array of parameters to ignore, ie `["headers", "user_id"]`.  In some cases, more fine-grained control is needed, in which case the `IIgnoreObjectV0` can be used.  Each parameter of the object points to a string that is used as a `RegExp` for filtering.  For example, `{path: "^/api/v2/foo/[a-zA-Z0-9]*$"}` will conflate the final alphanumeric path of `/api/v2/foo/` to the same hash.  Headers and stories work the same way, but mirroring their object structure to allow fine grained control for individual headers (ie ignoring all fields containing `user-agent`) or stories (ie ignoring all occurances of `"a835de14"` in a story).

#### Actions

A number of additional actions are available that, like ignore, conflate similar types of requsets to a single hash.  These are defined in typescript as:

```ts
type ActionsActionsV0 =
  | "make-header-keys-lowercase"
  | "deserialize-json-body"
  | "deserialize-x-www-form-urlencoded-body";
```

This corresponds to the following effects on the hashable object:

| Action | Effect |
| ------ | ------ |
| `make-header-keys-lowercase` | Makes all header keys lowercase, which is a sensible default, as header keys are not supposed to be case sensitive but unfortunately are treated as such in some exotic circumstances. |
| `deserialize-json-body` | Deserializes the body into JSON if the `Content-Type: application/json` header, or one of its variants, is present. |
| `deserialize-x-www-form-urlencoded-body` | Deserializes the body into key-value pairs if the `Content-Type: application/x-www-form-urlencoded-body` header, or one of its variants, is present. |