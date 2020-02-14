# unmock-runner

Core functions for the Unmock `runner`.

The Unmock `runner` wraps any test and runs that same test multiple times with different potential outcomes from the API. All of your unmock tests should use the `runner` unless you are absolutely certain that the API response will be the same every time.

### Jest

A Jest configuration for the `runner` is available through a separate [`unmock-jest-runner`](https://github.com/meeshkan/unmock-jest-runner) package. While the standard `unmock-runner` is available via NPM, you'll want to use the `unmock-jest-runner` when executing your tests to ensure proper error handling. 

The `unmock-jest-runner` can be installed via NPM or Yarn:

```
npm install -D unmock-jest-runner
yarn add unmock-jest-runner
```

Once installed, it can be imported and used as a wrapper for your tests:

```js
const runner = require("unmock-jest-runner").default;

test("my API always works as expected", runner(async () => {
  const res = await myApiFunction();
  // some expectations
}));
```

### Other configurations

As of now, Jest is the only package we have available. 

However, we're currently building out support for [Mocha]() and [Qunit](). You can follow the progress of those implementations in the corresponding issues.