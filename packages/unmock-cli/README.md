# unmock-cli

[![npm](https://img.shields.io/npm/v/unmock-cli.svg)][npmjs]
[![CircleCI](https://circleci.com/gh/unmock/unmock-js.svg?style=svg)](https://circleci.com/gh/unmock/unmock-js)
[![codecov](https://codecov.io/gh/unmock/unmock-js/branch/dev/graph/badge.svg)](https://codecov.io/gh/unmock/unmock-js)
[![Known Vulnerabilities](https://snyk.io/test/github/unmock/unmock-js/badge.svg?targetFile=package.json)](https://snyk.io/test/github/unmock/unmock-js?targetFile=package.json)

[npmjs]: https://www.npmjs.com/package/unmock
[build]: https://circleci.com/gh/unmock/unmock-js
[coverage]: https://coveralls.io/github/unmock/unmock-js

This package contains the base functions needed to build or extend the [unmock](../unmock/README.md) CLI.  It also contains the cli itself for testing purposes.

## Usage: unmock `<command>`

### Options:
  - `-h, --help` output usage information

### Commands:
  - `init [options] [dirname]` Sets up a new test suite
    - `--installer [installer]`  Specify Package Manager (yarn/npm)
    - `--offline` Specify whether to allow install from cache
    - `--verbose` Specify verbosity of output messages

  - `curl [options] <url>`
  - `open [options] <hash>`
  - `list`
