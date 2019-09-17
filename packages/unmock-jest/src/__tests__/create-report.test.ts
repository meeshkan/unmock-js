// Matchers from jest-dom
import "@testing-library/jest-dom/extend-expect";
import * as fs from "fs";
import { JSDOM } from "jsdom";
import * as path from "path";
import createReport from "../reporter/create-report";
import { writeToDirectory } from "../reporter/write-report";
import { exampleInput } from "./fake-data";

const readJson = (pathToJson: string): any => {
  const fullpath = path.isAbsolute(pathToJson)
    ? pathToJson
    : path.resolve(__dirname, pathToJson);
  const fileContents = fs.readFileSync(fullpath, { encoding: "utf-8" });
  return JSON.parse(fileContents);
};

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
   * Test for easier development, writes to file
   */
  it("should write HTML to file metadata", () => {
    const targetDirectory = path.resolve(__dirname, "output");
    writeToDirectory(report, {
      outputDirectory: targetDirectory,
      outputFilename: "report.html",
    });
  });
});
