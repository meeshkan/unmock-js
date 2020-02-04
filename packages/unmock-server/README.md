# unmock-server

[![npm](https://img.shields.io/npm/v/unmock-server.svg)](https://www.npmjs.com/package/unmock-server)
[![CircleCI](https://circleci.com/gh/unmock/unmock-js.svg?style=svg)](https://circleci.com/gh/unmock/unmock-js)
[![codecov](https://codecov.io/gh/unmock/unmock-js/branch/dev/graph/badge.svg)](https://codecov.io/gh/unmock/unmock-js)
[![Known Vulnerabilities](https://snyk.io/test/github/unmock/unmock-js/badge.svg?targetFile=package.json)](https://snyk.io/test/github/unmock/unmock-js?targetFile=package.json)

Unmock server mocks APIs using [unmock-js](https://github.com/unmock/unmock-js).


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

## Usage

Start `unmock-server` with `start` command:

```bash
$ unmock-server start
```

You need to add `npx` or `yarn` before the command depending on your installation method.

Running `unmock-server start` starts

1. an admin server at port 8888 for managing services
1. a proxy server at port 8008 for mocking requests
1. a mock server at port 8000 (HTTP) and 8443 (HTTPS) for internally handling requests made to the proxy.

### Using the mock proxy

To use the proxy for mocking requests, you need to:

1. Define services you want to mock (see below)

1. Set your HTTP client to use the locally running proxy

   >  `curl`: set environment variables
   > - `http_proxy=http://localhost:8008`
   > - `https_proxy=http://localhost:8008`
   > - Other clients may expect `HTTP_PROXY` and `HTTPS_PROXY` environment variables instead

1. If mocking a server using HTTPS, you need to fetch the certificate served by the mock proxy:

    > Fetch certificate:
    > ```bas
    > wget https://raw.githubusercontent.com/unmock/unmock-js/dev/packages/unmock-server/certs/ca.pem`
    > ```
    > You then need to add the mock server certificate to the list of trusted certificates.
    > For `curl`: set environment variable
    > - `SSL_CERT_FILE=ca.pem`

#### Example calls with `cURL`

- Request to proxy with HTTP: `http_proxy=http://localhost:8008 curl -i http://api.github.com/user/repos`
- Request to proxy with HTTPS: `https_proxy=http://localhost:8008 SSL_CERT_FILE=ca.pem curl -i https://api.github.com/user/repos`
- to mock server directly: `curl -i --header "X-Forwarded-Host: api.github.com" http://localhost:8000/user/repos`

### Managing services

You can manage services either via the admin API or via filesystem.

#### Using the admin server

Get all services:

```bash
$ curl http://localhost:8888/services
```

Post a new service with name `my-service`:

```bash
$ curl -X POST http://localhost:8888/services/my-service -H "Content-Type: application/json" --data "@/path/to/openapi.json"
```

Get a service description for service with name `my-service`:

```bash
$ curl http://localhost:8888/services/my-service
```

#### Using `__unmock__` folder

Prepare `__unmock__` folder with [OpenAPI specifications](https://www.unmock.io/docs/openapi).

> To mock `api.github.com`:
> 1. Prepare `__unmock__` folder:
> > ```bash
> > mkdir -p __unmock__/githubv3
> > ```
> 1. Put the GitHub OpenAPI specification to `__unmock__/githubv3`:
> > ```bash
> > wget https://raw.githubusercontent.com/unmock/DefinitelyMocked/master/services/githubv3/openapi.yaml -O __unmock__/githubv3/openapi.yaml`
> > ```

## Docker

Unmock server can also be used via Docker. See documentation for the [unmock/unmock-server](https://hub.docker.com/r/unmock/unmock-server) Docker image.

## Development

### Running the CLI

1. Compile TypeScript by running `npm run compile` at the root of the monorepo
1. Invoke [./bin/run](./bin/run) or [./bin/run.cmd](./bin/run.cmd).

### Creating new CA certificate

```bash
cd certs/
./openssl-gen.sh
```
