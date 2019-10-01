import "@testing-library/jest-dom/extend-expect";
import { JSDOM } from "jsdom";
import * as path from "path";
import createReport from "../reporter/create-report";
import { REDACTED } from "../reporter/utils";
import { writeToDirectory } from "../reporter/write-report";
import { exampleInput } from "./fake-data";
import { readJson } from "./utils";

const jestResults = readJson("resources/jest-results.json");
const unmockSnapshots = readJson("resources/unmock-snapshots.json");

describe("Report creator for given data", () => {
  const report = createReport(exampleInput);
  expect(report).toBeDefined();
  const dom = new JSDOM(report);
  it("should have header", () => {
    const title = dom.window.document.querySelector(".header");
    expect(title).toBeInTheDocument();
  });

  it("should have metadata", () => {
    const metadata = dom.window.document.querySelector(".metadata");
    expect(metadata).toBeInTheDocument();
  });
});

describe("Report creator for real test data", () => {
  const report = createReport({
    jestData: { aggregatedResult: jestResults },
    snapshots: unmockSnapshots,
  });
  const dom = new JSDOM(report);

  it("should have header", () => {
    const title = dom.window.document.querySelector(".header");
    expect(title).toBeInTheDocument();
  });

  it("should have metadata", () => {
    const metadata = dom.window.document.querySelector(".metadata");
    expect(metadata).toBeInTheDocument();
  });

  /**
   * Write to file for development
   */
  it("should write HTML to file for inspection", () => {
    const targetDirectory = path.resolve(__dirname, "output");
    writeToDirectory(report, {
      outputDirectory: targetDirectory,
      outputFilename: "report.html",
    });
  });
});

describe("Report creator auth redaction", () => {
  it("should not redact anything from test snapshots", () => {
    const testInput = {
      jestData: { aggregatedResult: jestResults },
      snapshots: unmockSnapshots,
    };
    const report = createReport(testInput);
    expect(report).not.toContain(REDACTED);
  });
  it("should redact auth from header", () => {
    const snapshot = unmockSnapshots[0];
    const testSnapshot = {
      ...snapshot,
      data: {
        ...snapshot.data,
        req: {
          ...snapshot.data.req,
          headers: {
            Authorization: "Bearer foo",
          },
        },
      },
    };
    const testInput = {
      jestData: { aggregatedResult: jestResults },
      snapshots: [testSnapshot],
    };
    const report = createReport(testInput);
    expect(report).toContain(REDACTED);
  });
});
