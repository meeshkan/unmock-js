# unmock-runner

With the Unmock `runner`, you can run any test multiple times with different potential outcomes from the API. All of your unmock tests should use the `runner` unless you are absolutely certain that the API response will be the same every time.

## Default

By default, the `runner` is set to run your test 20 times.

### Changing the default

To change the number of times that your test will run, you need to pass a second argument to the `runner` function. This will be an object where you set the `maxLoop` value to another integer.

```js
// We don't set a value for maxLoop, so this test uses the default
test("This test will run 20 times", runner(async () => {
  const res = await myApiFunction();
  // some expectations
}));

// Now we pass a second argument to the runner that sets the maxLoop to 100 
test("This test will run 100 times", runner(async () => {
  const res = await myApiFunction();
  // some expectations
}, { maxLoop: 100 }));
```

## Jest

A Jest configuration for the `runner` is available through a separate [`unmock-jest-runner`](https://github.com/meeshkan/unmock-jest-runner) package. While the standard `unmock-runner` is available via NPM, you'll want to use the `unmock-jest-runner` when executing your tests to ensure proper error handling. 

The `unmock-jest-runner` can be installed via NPM or Yarn:

```
npm install -D unmock-jest-runner
yarn add unmock-jest-runner
```

Once installed, the `runner` can be imported as a default and used as a wrapper for your tests:

```js
const runner = require("unmock-jest-runner").default;

test("My API always works as expected", runner(async () => {
  const res = await myApiFunction();
  // some expectations
}));
```

## Other configurations

As of now, Jest is the only package we have available. 

However, we're currently building out support for [Mocha](https://github.com/Meeshkan/unmock-js/issues/299) and [QUnit](https://github.com/Meeshkan/unmock-js/issues/300). You can follow the progress of those implementations in the corresponding issues.