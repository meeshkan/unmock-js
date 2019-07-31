# unmock-node

[![npm](https://img.shields.io/npm/v/unmock-node.svg)][npmjs]
[![CircleCI](https://circleci.com/gh/unmock/unmock-js.svg?style=svg)](https://circleci.com/gh/unmock/unmock-js)
[![codecov](https://codecov.io/gh/unmock/unmock-js/branch/dev/graph/badge.svg)](https://codecov.io/gh/unmock/unmock-js)
[![Known Vulnerabilities](https://snyk.io/test/github/unmock/unmock-js/badge.svg?targetFile=package.json)](https://snyk.io/test/github/unmock/unmock-js?targetFile=package.json)

[npmjs]: https://www.npmjs.com/package/unmock
[build]: https://circleci.com/gh/unmock/unmock-js
[coverage]: https://coveralls.io/github/unmock/unmock-js

Testing library for mocking external services in Node.js.

To get started, visit [unmock.io](https://unmock.io).

**Table of Contents**

<!-- toc -->

- [unmock-node](#unmock-node)
  - [How does it work?](#how-does-it-work)
  - [Install](#install)
    - [Node version support](#node-version-support)
  - [Usage](#usage)
  - [Contributing](#contributing)
  - [License](#license)

<!-- tocstop -->

## How does it work?

Unmock-node uses [node-mitm](https://github.com/moll/node-mitm) library to capture outgoing HTTP calls, injecting JIT or persisted mocks of hundreds of APIs.

## Install

```sh
$ npm install --save-dev unmock-node
```

or

```sh
$ yarn add -D unmock-node
```

### Node version support

The latest version of unmock supports all currently maintained Node versions, see [Node Release Schedule](https://github.com/nodejs/Release#release-schedule)

## Usage

See the documentation in [unmock.io](https://unmock.io).

## Contributing

Thanks for wanting to contribute! Take a look at our [Contributing Guide](CONTRIBUTING.md) for notes on our commit message conventions and how to run tests.

Please note that this project is released with a [Contributor Code of Conduct](CODE_OF_CONDUCT.md).
By participating in this project you agree to abide by its terms.

## License

[MIT](LICENSE)

Copyright (c) 2018–2019 [Meeshkan](http://meeshkan.com) and other [contributors](https://github.com/unmock/unmock-js/graphs/contributors).
