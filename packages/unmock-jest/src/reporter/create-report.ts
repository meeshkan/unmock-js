import { Dictionary, forEach, groupBy, mapValues } from "lodash";
import { ISnapshot } from "unmock";
import xmlBuilder = require("xmlbuilder");
import stylesheet from "./stylesheet";
import { IReportInput } from "./types";

const createHtmlBase = () => {
  const htmlBase = {
    html: {
      head: {
        meta: { "@charset": "utf-8" },
        title: { "#text": "Unmock report" },
        style: { "@type": "text/css", "#text": stylesheet },
      },
    },
  };

  return xmlBuilder.create(htmlBase);
};

export const PAGE_TITLE = "Unmock Jest report";

export interface ITestSuite {
  suiteResults: jest.TestResult;
  snapshots: ISnapshot[];
}

const groupTestsByFilePath = (input: IReportInput): Dictionary<ITestSuite> => {
  const groupedResultsByFilePath = groupBy(
    input.jestData.aggregatedResult.testResults,
    testResult => testResult.testFilePath,
  );

  const testResultByFilePath = mapValues(groupedResultsByFilePath, results => {
    if (results.length > 1) {
      // TODO What does this mean and is this possible?
      throw Error(
        "Did not expect to get multiple test results for a single file",
      );
    }

    return results[0];
  });

  const snapshotsByFilePath = groupBy(
    input.snapshots,
    snapshot => snapshot.testPath,
  );

  const combined = mapValues(testResultByFilePath, (value, filepath) => ({
    suiteResults: value,
    snapshots: snapshotsByFilePath[filepath] || [],
  }));

  return combined;
};

const createTestSuiteNode = (
  filename: string,
  testSuite: ITestSuite,
): xmlBuilder.XMLDocument => {
  const element = xmlBuilder.begin().ele("div", { class: "test-suite" });
  element.ele("div", { class: "test-suite__title" }, filename);

  const suiteResult = testSuite.suiteResults;

  const snapshots = testSuite.snapshots;

  const numPassingTests = suiteResult.numPassingTests;
  const numFailingTests = suiteResult.numFailingTests;

  const classFlag =
    numFailingTests === 0
      ? " test-suite__results--success"
      : " test-suite__results--failure";

  element.ele(
    "div",
    {
      class: "test-suite__results" + classFlag,
    },
    `Passing: ${numPassingTests}, failing: ${numFailingTests}, snapshots: ${snapshots.length}`,
  );

  return element;
};

const renderBody = (input: IReportInput): xmlBuilder.XMLDocument => {
  const reportBody = xmlBuilder.begin().element("div", { class: "report" });

  // Header
  reportBody.ele("header").ele("h1", { class: "header" }, PAGE_TITLE);

  // Timestamp
  reportBody.ele("div", { class: "timestamp" }, new Date().toString());

  const aggregatedResult = input.jestData.aggregatedResult;

  // Test run metadata
  reportBody.ele(
    "div",
    { class: "metadata" },
    `${aggregatedResult.numTotalTests} tests -- ${aggregatedResult.numPassedTests} passed / ${aggregatedResult.numFailedTests} failed / ${aggregatedResult.numPendingTests} pending`,
  );

  const testResultsElement = reportBody.ele("div", { class: "test-results" });

  const grouped = groupTestsByFilePath(input);

  const testSuitesNodes = mapValues(grouped, (testResults, filename) =>
    createTestSuiteNode(filename, testResults),
  );

  forEach(testSuitesNodes, node => {
    const block = testResultsElement.ele("div");
    block.importDocument(node);
  });

  return reportBody;
};

export const createReport = (input: IReportInput) => {
  const htmlOutput = createHtmlBase();
  const body = renderBody(input);
  htmlOutput.ele("body").importDocument(body);
  return htmlOutput.end({ pretty: true });
};

export default createReport;
