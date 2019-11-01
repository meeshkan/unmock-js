# unmock-server

[![npm](https://img.shields.io/npm/v/unmock-server.svg)](https://www.npmjs.com/package/unmock-server)
[![CircleCI](https://circleci.com/gh/unmock/unmock-js.svg?style=svg)](https://circleci.com/gh/unmock/unmock-js)
[![codecov](https://codecov.io/gh/unmock/unmock-js/branch/dev/graph/badge.svg)](https://codecov.io/gh/unmock/unmock-js)
[![Known Vulnerabilities](https://snyk.io/test/github/unmock/unmock-js/badge.svg?targetFile=package.json)](https://snyk.io/test/github/unmock/unmock-js?targetFile=package.json)

Unmock server.

## What it does

Unmock server mocks APIs using [unmock-js](https://github.com/unmock/unmock-js).

## How it works

At startup, Unmock server starts

1. a proxy server at port 8008
1. a mock server at port 8000 (HTTP) and 8443 (HTTPS)

To use the mock server for mocking API responses, you need to 

1. Set your HTTP client to use the local proxy

   >  `curl`: set environment variables
   > - `http_proxy=http://localhost:8008`
   > - `https_proxy=http://localhost:8008`
   > - Other clients may expect `HTTP_PROXY` and `HTTPS_PROXY` environment variables instead

1. Trust the certificates served by the mock proxy if using HTTPS:

    > Fetch certificate:
    > `wget https://raw.githubusercontent.com/unmock/unmock-js/snicallback/packages/unmock-server/certs/ca.pem`
    > For `curl`: set environment variable
    > - `SSL_CERT_FILE=ca.pem`

## How to use it

### Docker

See documentation for the [unmock/unmock-server](https://hub.docker.com/r/unmock/unmock-server) Docker image.

### CLI usage via `npm`

Coming soon 👷‍♀️ 

### Stand-alone

1. Clone [unmock-js](https://github.com/unmock/unmock-js) repository.
1. Install dependencies: `npm i`
1. Build TypeScript: `npm run compile`
1. If mocking HTTPS server, fetch the Unmock certificate used for signing certificates:

    > `wget https://raw.githubusercontent.com/unmock/unmock-js/snicallback/packages/unmock-server/certs/ca.pem`

1. Prepare `__unmock__` folder with [OpenAPI specifications](https://www.unmock.io/docs/openapi)

    > To mock `api.github.com`:
    > 1. Fetch OpenAPI specification: `wget https://raw.githubusercontent.com/unmock/DefinitelyMocked/master/services/githubv3/openapi.yaml`
    > 1. Prepare `__unmock__` folder: `mkdir -p __unmock__/githubv3`
    > 1. `mv openapi.yaml __unmock__/githubv3`

1. Start proxy and servers: `node packages/unmock-server/index.js`
1. Start making calls
    - to mock server: `curl -i --header "X-Forwarded-Host: api.github.com" http://localhost:8000/user/repos`
    - to proxy with HTTP: `http_proxy=http://localhost:8008 curl -i http://api.github.com/user/repos`
    - to proxy with HTTPS: `https_proxy=http://localhost:8008 SSL_CERT_FILE=ca.pem curl -i https://api.github.com/user/repos`

## Development

### Creating new CA certificate

```bash
cd certs/
./openssl-gen.sh
```
