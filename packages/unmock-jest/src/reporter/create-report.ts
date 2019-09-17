import { Dictionary, forEach, map } from "lodash";
import stripAnsi from "strip-ansi";
import { ISnapshot } from "unmock";
import xmlBuilder = require("xmlbuilder");
import stylesheet from "./stylesheet";
import { IReportInput, ITestSuite } from "./types";
import { groupTestsByFilePath } from "./utils";

const createHtmlBase = (): xmlBuilder.XMLDocument => {
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

const buildTestTitle = (assertionResult: jest.AssertionResult) =>
  assertionResult.ancestorTitles
    .map(ancestorTitle => `${ancestorTitle} > `)
    .join(" ") + assertionResult.title;

/**
 * Build a div containing the results for a single test ("assertion")
 */
const buildTestDiv = (
  assertionResult: jest.AssertionResult,
  snapshots: ISnapshot[],
): xmlBuilder.XMLDocument => {
  const statusClass =
    assertionResult.failureMessages.length > 0
      ? "test-suite__test--failure"
      : "test-suite__test--success";

  const testDiv = xmlBuilder
    .begin()
    .ele("div", { class: `test-suite__test ${statusClass}` });

  // Title
  const testTitle = buildTestTitle(assertionResult);
  testDiv.ele("div", { class: "test-suite__test-title" }, testTitle);

  // Failure messages
  if (assertionResult.failureMessages.length > 0) {
    const failureDiv = testDiv.ele("div", {
      class: "test-suite__test-failure-messages",
    });
    failureDiv.raw(
      `Failure message: ${stripAnsi(
        assertionResult.failureMessages.join(", "),
      )}`,
    );
  }

  // Snapshots
  testDiv.ele(
    "div",
    { class: "test-suite__test-snapshots" },
    `${snapshots.length} snapshot(s)`,
  );

  return testDiv;
};

/**
 * Build a div for showing the results for a single test suite (a single test file).
 * @param filename Test file path
 * @param testSuite Test suite results
 */
const buildTestSuiteDiv = (
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

  const testResults = element.ele(
    "div",
    {
      class: "test-suite__results" + classFlag,
    },
    `Passing: ${numPassingTests}, failing: ${numFailingTests}, snapshots: ${snapshots.length}`,
  );

  const testElements: xmlBuilder.XMLDocument[] = map(
    suiteResult.testResults,
    assertionResult => {
      const snapshotsForTest = snapshots.filter(
        snapshot => snapshot.currentTestName === assertionResult.fullName,
      );
      return buildTestDiv(assertionResult, snapshotsForTest);
    },
  );

  forEach(testElements, testBlock => {
    testResults.importDocument(testBlock);
  });

  return element;
};

/**
 * Build the header div containing title, timestamp, summary, etc.
 */
const buildHeaderDiv = (input: IReportInput): xmlBuilder.XMLDocument => {
  const headerDiv = xmlBuilder.begin().ele("div", { class: "header" });
  headerDiv.ele("header").ele("h1", { class: "header" }, PAGE_TITLE);

  // Timestamp
  headerDiv.ele("div", { class: "timestamp" }, new Date().toString());

  const aggregatedResult = input.jestData.aggregatedResult;

  // Test run metadata
  headerDiv.ele(
    "div",
    { class: "metadata" },
    `${aggregatedResult.numTotalTests} tests -- ${aggregatedResult.numPassedTests} passed / ${aggregatedResult.numFailedTests} failed / ${aggregatedResult.numPendingTests} pending`,
  );

  return headerDiv;
};

/**
 * Build div containing results for all test files (excluding header etc.)
 */
const buildTestResultsDiv = (input: IReportInput): xmlBuilder.XMLDocument => {
  const root = xmlBuilder.begin().ele("div", { class: "test-results" });

  const grouped: Dictionary<ITestSuite> = groupTestsByFilePath(input);

  const testSuiteElements: xmlBuilder.XMLDocument[] = map(
    grouped,
    (testResults, filename) => buildTestSuiteDiv(filename, testResults),
  );

  forEach(testSuiteElements, node => {
    const block = root.ele("div");
    block.importDocument(node);
  });
  return root;
};

const buildBodyDiv = (input: IReportInput): xmlBuilder.XMLDocument => {
  const reportBody = xmlBuilder.begin().element("div", { class: "report" });

  // Header
  reportBody.importDocument(buildHeaderDiv(input));

  // Test results
  reportBody.importDocument(buildTestResultsDiv(input));

  return reportBody;
};

export const createReport = (input: IReportInput) => {
  const htmlOutput: xmlBuilder.XMLDocument = createHtmlBase();
  const body: xmlBuilder.XMLDocument = buildBodyDiv(input);
  htmlOutput.ele("body").importDocument(body);
  return htmlOutput.end({ pretty: true });
};

export default createReport;
