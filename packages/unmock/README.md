# unmock

[![npm](https://img.shields.io/npm/v/unmock-cli.svg)][npmjs]
[![CircleCI](https://circleci.com/gh/unmock/unmock-js.svg?style=svg)](https://circleci.com/gh/unmock/unmock-js)
[![codecov](https://codecov.io/gh/unmock/unmock-js/branch/dev/graph/badge.svg)](https://codecov.io/gh/unmock/unmock-js)
[![Known Vulnerabilities](https://snyk.io/test/github/unmock/unmock-js/badge.svg?targetFile=package.json)](https://snyk.io/test/github/unmock/unmock-js?targetFile=package.json)

[npmjs]: https://www.npmjs.com/package/unmock
[build]: https://circleci.com/gh/unmock/unmock-js
[coverage]: https://coveralls.io/github/unmock/unmock-js

A CLI for inspecting projects using unmock and calling the unmock server to generate reliable fake data.

```bash
$ unmock --help
Usage: unmock unmock <command>

Options:
  -h, --help             output usage information

Commands:
  curl [options] <url>
  open [options] <hash>
  list
```

## curl

```bash
$ unmock curl --help
Usage: curl [options] <url>

Options:
  -d, --data [data]      HTTP POST data
  -H, --header [header]  Pass custom header(s) to server (default: [])
  -X                     --request [command]
  -S                     --signature [signature]
  -h, --help             output usage information
```

## list

```bash
$ unmock list --help
Usage: list [options]

Options:
  -h, --help  output usage information
```

## open

```bash
$ unmock open --help
Usage: open [options] <hash>

Options:
  -e, --editor [editor]  editor (defaults to the EDITOR env variable or, in the absence of this, vi)
  -h, --help             output usage information
```