# CHANGELOG.md

## 0.3.13 (2020-02-11)

Features:

  - Add programmatic `Faker API` for creating and managing services
  - Add `stop` command to `unmock-server` 
  - Extract `runner` from `unmock-core`
  - Add new `unmock-runner` package with `jestRunner` for Jest configuration

## 0.3.12 (2020-01-09)

Fixes:

  - Fixed bug in `unmock-server` CLI by including `oclif.manifest.json` in the package.

Features:

  - Updated packages to fix security vulnerabilities

## 0.3.11 (2019-12-19)

Features:

  - Add CLI to `unmock-server`
  - Add `unmock-browser` package, which runs `unmock-js` in browser and React Native
  - Implement parsing of request headers in `unmock-fetch`
  - Add `unmock-types` package
  - Extract `UnmockFaker` class from `Backend` class
  - Rename `unmock.newFaker()` to `unmock.faker()`

Fixes:

  - Remove `concurrently` dependency

## 0.3.10 (2019-11-4)

Features:

  - Add `unmock-server`, a mock server
  - Add `unmock.randomize.on()` option for randomizing responses
  - Introduce `unmock` CLI in `unmock-cli` package

## 0.3.9 (2019-10-17)

Features:

  - Extract `unmock-node` from `unmock-core` for better portability to other environments
  - Add `unmock-fetch` package

## 0.3.8 (2019-9-27)

Features:

  - Request and response include `bodyAsJson` for convenient access to a parsed object
  - Include request headers in Jest reporter and redact `Authorization` fields
  - Adds `u.opt`

Fixes:

  - Fix missing Faker issue [#272](https://github.com/unmock/unmock-js/issues/272)
  - Adds certain types as a dependency

## 0.3.7 (2019-9-26)

Fixes:

  - Fixes a bug in the reporter where no test suites were shown

## 0.3.6 (2019-9-26)

Fixes:

  - fixes a bug where path parameters were incorrectly matched if they were anything other than a string.

## 0.3.5 (2019-9-25)

Features:

  - the `runner` no longer needs manual resetting of the spies

Fixes:

  - `json-schema-faker` ignored `minItems`, which is now disabled. as a result, there is a slight regression in the fuzzing (it is less fuzzy) that we can address in a future release.


## 0.3.4 (2019-09-22)

Features:

  - `nock`-like syntax for setting request headers, response headers, request bodies, and queries

## 0.3.3 (2019-09-20)

Features:

  - Added more randomization to test runner
  - Added more accessors to spy methods, for example, `postResponseCode`
  - Added `unmock.associate` method for associating a service with a URL
  - Changed Jest reporter to show only one test suite at a time

## 0.3.2 (2019-09-18)

Features:

  - Added `mapDefaultTo` to the transformer in order to map a default OpenAPI response to another code.
  - Made it possible for JSON schema objects created by `u` to contain plain JSON objects that will be turned into constants.

Fixes:

  - Made prettier work in each repo of the monorepo, resulting in a lot of changes. The whole thing is more readable now.

## 0.3.1 (2019-09-18)

Breaking changes:

  - Renamed `unmock.gen` package as `unmock.transform`
  - Renamed `unmock.transform.<method>.address` package as `unmock.transform.<method>.lens`

## 0.3.0 (2019-09-17)

Features:

  - New state mananagement system using `monocle-ts` and functional programming conventions. To set the state of any service, you use a function that accepts a request and an OpenAPI schema and returns a modified schema.
  - A new runner for fuzz testing.

## 0.2.2 (2019-09-16)

Fixes:

  - Disabled `esModuleInterop` in `tsconfig.json` so that the package can be used without `esModuleInterop`

Features:

  - Added initial `nock`-like syntax for declaring services
  - Added `unmock-jest` package for Unmock Jest reporter
  - Added snapshotting of requests to local disk so they're available for the Jest reporter

## 0.2.1 (2019-08-30)

Breaking changes:

  - Renamed `unmock-node` package as `unmock`

Fixes:

  - Added the missing SinonJS types
  - Fixed setting state using reserved OpenAPI schema keywords such as `type`

Features:

  - Added `pathname` and `query` request object
  - Added spy helpers such as `postResponseBody`

## 0.2.0 (2019-08-23)

Breaking changes:

  - `unmock.on()` returns `this` instead of `states` object.
  - Deleted `unmock.states`: state changes should be done via `unmock.services["service"].state`

Features:

  - Exports `UnmockRequest`, `UnmockResponse` and other exposed types
  - Adds service spy for keeping track of service calls
  - Exports `sinon` for easy assertions on service spy

## 0.1.10 (2019-08-14)

Fixes:

  - Remove polyfills polluting global scope

## 0.1.9 (2019-08-13)

Fixes:

  - Add missing core-js dependency to packages

## 0.1.8 (2019-08-12)

Features:

  - Package compilation with Babel to support Node.js >= 6
  - Better formatting for error messages
  - Read services from `node_modules/@unmock` in addition to `__unmock__`

## 0.1.7 (2019-08-07)

Features:

  - Export types `Request` and `States`
  - Add typing to `states` object

Fixes:

  - Fix issue in Node<10 where `URL` was used without it being available

## 0.1.6 (2019-08-06)

Features:

  - Add `allowedHosts` object to `unmock` to add new allowed hosts
  - Add flaky mode with `unmock.flaky.on()`
  - Add better error messages when no matching operation is found from the specification
  - Allow changing service state with functions taking the request as an argument

Fixes:

  - Fix bugs in loas3 in handling references

## 0.1.5 (2019-07-26)

Fix:

  - `dist/` directory was missing from the release because of a bug in the CI/CD pipeline [#107](https://github.com/unmock/unmock-js/pull/107)

## 0.1.4 (2019-07-25)

Features:

  - Setting states is now a typed experience. Hints on how to use the state facade object are available -> [ba6a78f](https://github.com/unmock/unmock-js/commit/ba6a78f).
    - As services are dynamically loaded, hints for available services do not show up. You may use the services dynamically as usual though.
  - `textResponse` is now infered automatically when setting a state with a string -> [bd9ac1](https://github.com/unmock/unmock-js/commit/bd9ac1)
    - If you need to specify additional DSL instructions, you still need to use `textResponse`.

Fix:

  - Dereferencing JSON `$ref` instructions only happens when needed (setting a state) -> [36cf981](https://github.com/unmock/unmock-js/commit/36cf981)
    - Dereferencing certain services took long otherwise and was redundant work.
    - For the time being, only dereferences internal references and references to local files.
  - Renames `textMW` transformer to `textResponse` -> [3c43358](https://github.com/unmock/unmock-js/commit/3c43358)
  - Import notation no longer requires an asterisk (`import unmock from "unmock-node"`) -> [cdd46ee](https://github.com/unmock/unmock-js/commit/cdd46ee)
  - `middleware` renamed to `dsl`, with `objResponse` as a named export instead of the default (`import { dsl } from "unmock-node"`) -> [cdd46ee](https://github.com/unmock/unmock-js/commit/cdd46ee)

Bugfixes:

  - Replace server path prefix (terminated with a `/`) with `/`, instead of removing the non-terminated path prefix -> [30083e5](https://github.com/unmock/unmock-js/commit/30083e5)
    - When a service path prefix and an endpoint shared the same prefix, setting a state would break (e.g. consider Slack's `/api/` service prefix and `/api.test` endpoint).

## 0.1.3 (2019-07-19)

Bugfixes:

  - Generator no longer uses the default values for consecutive generation calls -> [30e1519](https://github.com/unmock/unmock-js/commit/30e1519)
    - The use of default values is set for header generation and was not cancelled before body generation.

## 0.1.2 (2019-07-19)

Features:

  - Resolve JSON `$ref` when loading a service -> [8cff0bf](https://github.com/unmock/unmock-js/commit/8cff0bf)

## 0.1.1 (2019-07-18)

Bugfixes:

  - If the `required` field is not stated in the response specification, automatically generate _all_ the fields in the matching response. If it is present, randomly select which additional fields to generate -> [a414f89](https://github.com/unmock/unmock-js/commit/a414f89)

## 0.1.0 (2019-07-18)

Initial release.  
Features:

  - (OpenAPI) Specification-based automatic mocking system.
  - Interception of requests with a NodeJS backend client - your test code requests won't reach 3rd party APIs by mistake!
  - Basic options to control whitelisted URLs (supports wildcards and regular expressions).
  - State management system (user may supply their own values to generate matching responses from the specification).
    - Users may set states with object notation (`{ users: { social: { facebook: "facebook_id" }}}`) and textual responses (for `plain/text` endpoints) using `textResponse` (`textResponse("foobar")`). These are found under the exported `middleware` object. Refer to documentation for more examples and clarification.
    - Fluent API access to set the states, supporting wildcard matches, REST methods, custom service names, etc.
    - States are applied to endpoints for which they are valid. If no endpoint is specified, all endpoints and all REST methods are checked for the given state.
    - Runtime error for mismatching values, attempting to set states for non-existing endpoints, etc.
  - Basic unmock DSL to allow fine-tuned modification of mocked responses ("states").
    - `$code` (to specify response status code), `$times` (to specify number of times a state is valid) and `$size` (to specify the size of an array).
  - Boilerplate code for future expansion into `jsdom` and future `CLI` support.