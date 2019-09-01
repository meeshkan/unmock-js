[![CircleCI](https://circleci.com/gh/unmock/unmock-js.svg?style=svg)](https://circleci.com/gh/unmock/unmock-js)
[![codecov](https://codecov.io/gh/unmock/unmock-js/branch/dev/graph/badge.svg)](https://codecov.io/gh/unmock/unmock-js)
[![Known Vulnerabilities](https://snyk.io/test/github/unmock/unmock-js/badge.svg?targetFile=package.json)](https://snyk.io/test/github/unmock/unmock-js?targetFile=package.json)

# unmock

A new way to mock API dependencies.

**Table of Contents**

<!-- toc -->

- [unmock](#unmock)
  - [How does it work?](#how-does-it-work)
  - [Install](#install)
  - [Usage](#usage)
  - [Contributing](#contributing)
  - [License](#license)

<!-- tocstop -->

## How does it work?

Unmock works by capturing HTTP calls in your code and injecting responses from mocked versions of services initialized at arbitrary states.

## Install

Any of the subpackages in this project can be installed via `npm` or `yarn`.

```sh
$ npm install --save unmock # all the packages
$ npm install --save unmock-<tool> # specific unmock tools (core, cli, expect, etc)
```

## Usage

This package contains the following six repositories.

| Package                                           | Description                                             |
| ------------------------------------------------- | ------------------------------------------------------- |
| [`unmock`](packages/unmock/README.md)             | Main CLI                                                |
| [`unmock-cli`](packages/unmock-cli/README.md)     | Functions for the CLI, useful for building a custom CLI |
| [`unmock-core`](packages/unmock-core/README.md)   | Core Node SDK                                           |

## Contributing

Thanks for wanting to contribute! Take a look at our [Contributing Guide](CONTRIBUTING.md) for notes on our commit message conventions and how to run tests.

Please note that this project is released with a [Contributor Code of Conduct](CODE_OF_CONDUCT.md).
By participating in this project you agree to abide by its terms.

## Development

- See [publish.md](./publish.md) for instructions how to make a new release

## License

[MIT](LICENSE)

Copyright (c) 2018–2019 [Meeshkan](http://meeshkan.com) and other [contributors](https://github.com/unmock/unmock-js/graphs/contributors).
