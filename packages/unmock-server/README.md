# unmock-server

[![npm](https://img.shields.io/npm/v/unmock-server.svg)](https://www.npmjs.com/package/unmock-server)
[![CircleCI](https://circleci.com/gh/unmock/unmock-js.svg?style=svg)](https://circleci.com/gh/unmock/unmock-js)
[![codecov](https://codecov.io/gh/unmock/unmock-js/branch/dev/graph/badge.svg)](https://codecov.io/gh/unmock/unmock-js)
[![Known Vulnerabilities](https://snyk.io/test/github/unmock/unmock-js/badge.svg?targetFile=package.json)](https://snyk.io/test/github/unmock/unmock-js?targetFile=package.json)

Unmock server mocks APIs using [unmock-js](https://github.com/unmock/unmock-js).

## How it works

Unmock server consists of

1. a proxy server at port 8008
1. a mock server at port 8000 (HTTP) and 8443 (HTTPS)

Once the server and proxy are running, you can use the proxy to mock an API. For that, you need to:

1. Prepare specifications for your [services](https://www.unmock.io/docs/openapi) in `__unmock__` directory

1. Start Unmock server and proxy (see below)

1. Set your HTTP client to use the locally running proxy

   >  `curl`: set environment variables
   > - `http_proxy=http://localhost:8008`
   > - `https_proxy=http://localhost:8008`
   > - Other clients may expect `HTTP_PROXY` and `HTTPS_PROXY` environment variables instead

1. Trust the certificates served by the mock proxy if using HTTPS:

    > Fetch certificate:
    > ```bas
    > wget https://raw.githubusercontent.com/unmock/unmock-js/dev/packages/unmock-server/certs/ca.pem`
    > ```
    > For `curl`: set environment variable
    > - `SSL_CERT_FILE=ca.pem`

## Installation

### `npm`

The npm package ships with `unmock-server` binary that you can add either in project or globally.

#### Install to a project

```bash
npm install unmock-server
# OR
yarn add unmock-server
```

Invoke CLI via `npx` or `yarn`:

```bash
npx unmock-server --help
# OR
yarn unmock-server --help
```

#### Install globally

```bash
npm install -g unmock-server
# OR
yarn global add unmock-server
```

In this case, you can invoke `unmock-server` without `npx` or `yarn`:

```bash
unmock-server --help
```

### Install from source

1. Clone [unmock-js](https://github.com/unmock/unmock-js) repository.
1. Install dependencies: `npm i`
1. Build TypeScript: `npm run compile`
1. Invoke the CLI: `node packages/unmock-server/bin/run`

## How to use it

### 1. Prepare the certificate (HTTPS only)

If mocking HTTPS server, fetch the Unmock certificate used for signing certificates:

```bash
wget https://raw.githubusercontent.com/unmock/unmock-js/dev/packages/unmock-server/certs/ca.pem
```

### 2. Prepare services

Prepare `__unmock__` folder with [OpenAPI specifications](https://www.unmock.io/docs/openapi).

> To mock `api.github.com`:
> 1. Prepare `__unmock__` folder:
> > ```bash
> > mkdir -p __unmock__/githubv3
> > ```
> 1. Fetch OpenAPI specification:
> > ```bash
> > wget https://raw.githubusercontent.com/unmock/DefinitelyMocked/master/services/githubv3/openapi.yaml -O __unmock__/githubv3/openapi.yaml`
> > ```

### Start server

Start Unmock server and proxy:

```bash
unmock-server start
```

### Start making calls

Make calls
- to proxy with HTTP: `http_proxy=http://localhost:8008 curl -i http://api.github.com/user/repos`
- to proxy with HTTPS: `https_proxy=http://localhost:8008 SSL_CERT_FILE=ca.pem curl -i https://api.github.com/user/repos`
- to mock server directly: `curl -i --header "X-Forwarded-Host: api.github.com" http://localhost:8000/user/repos`

## Docker

Unmock server can also be used via Docker. See documentation for the [unmock/unmock-server](https://hub.docker.com/r/unmock/unmock-server) Docker image.

## Development

### Creating new CA certificate

```bash
cd certs/
./openssl-gen.sh
```
