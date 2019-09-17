# unmock-jest

Jest reporter for [Unmock](https://unmock.io).

Read full documentation at [unmock.io](https://unmock.io).

## Installation

```
npm i unmock-jest -D
// or
yarn add unmock-jest -D
```

## Usage

In your [Jest configuration](https://jestjs.io/docs/en/configuration#reporters-array-modulename-modulename-options), add `"unmock-jest/reporter"` as reporter:

```
// jest.config.js
{
    reporters: ["default", "unmock-jest/reporter"]
}
```

Then run your tests and a report is generated.

Note that `unmock` must also be installed.

## Configuration

You can define options in the reporter configuration:

```
// jest.config.js
{
    reporters: [
      "default",
      [ "unmock-jest", { outputDirectory: "reports" } ]
  ]
}
```

Following options are available:

| Reporter Config Name| Description | Default |
|--|--|--|
| `outputDirectory` | Directory to save the output | "\_\_unmock\_\_/" |
| `outputFilename` | File name for the output | "unmock-report.html" |
