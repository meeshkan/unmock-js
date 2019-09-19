import { forEach, map } from "lodash";
import * as React from "react";
import * as ReactDomServer from "react-dom/server";
import stripAnsi from "strip-ansi";
import { ISnapshot } from "unmock";
import xmlBuilder = require("xmlbuilder");
import Calls from "./components/calls";
import stylesheet from "./stylesheet";
import { IReportInput, ITestSuite } from "./types";
import { sortTestSuites, toTestSuites } from "./utils";

const createHtmlBase = (): xmlBuilder.XMLDocument => {
  const htmlBase = {
    html: {
      head: {
        meta: { "@charset": "utf-8" },
        title: { "#text": "Unmock report" },
        link: {
          "@href":
            "https://fonts.googleapis.com/css?family=Lato:100,300,400,700,900",
          "@rel": "stylesheet",
        },
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

const renderReact = (element: React.ReactElement): string =>
  ReactDomServer.renderToStaticMarkup(element);

/**
 * Build a div containing the results for a single test ("assertion")
 * @param assertionResult Jest results for the test
 * @param snapshots All unmock snapshots for **this test**
 */
const buildTestDiv = (
  assertionResult: jest.AssertionResult,
  snapshots: ISnapshot[],
): xmlBuilder.XMLDocument => {
  const statusClass =
    assertionResult.failureMessages.length > 0
      ? "test--failure"
      : "test--success";

  const testDiv = xmlBuilder
    .begin()
    .ele("div", { class: `test ${statusClass}` });

  // Title
  const testTitle = buildTestTitle(assertionResult);
  testDiv.ele("div", { class: "test-title" }, testTitle);

  // Failure messages
  if (assertionResult.failureMessages.length > 0) {
    const failureDiv = testDiv.ele("div", {
      class: "test-failure-messages",
    });
    failureDiv.raw(
      `Failure message: ${stripAnsi(
        assertionResult.failureMessages.join(", "),
      )}`,
    );
  }

  const callsElement = <Calls assertionResult={assertionResult}  snapshots={snapshots}/>;

  testDiv.raw(renderReact(callsElement));

  return testDiv;
};

/**
 * Build title div for test suite
 */
const buildTestSuiteTitleDiv = (
  filename: string,
  testSuite: ITestSuite,
): xmlBuilder.XMLDocument => {
  const suiteResult = testSuite.suiteResults;
  const numFailingTests = suiteResult.numFailingTests;
  const snapshots = testSuite.snapshots;
  const numPassingTests = suiteResult.numPassingTests;
  const div = xmlBuilder.begin().ele("div", {
    class: "test-suite__title",
  });

  div.ele("div", { class: "test-suite__title-filename" }, filename);

  div.ele(
    "div",
    { class: "test-suite__title-summary" },
    `Passing: ${numPassingTests}, failing: ${numFailingTests}, HTTP calls: ${snapshots.length}`,
  );
  return div;
};

/**
 * Build a div for showing the results for a single test suite (a single test file).
 * @param filename Test file path
 * @param testSuite Test suite results
 */
const buildTestSuiteDiv = (
  testSuite: ITestSuite,
): xmlBuilder.XMLDocument => {
  const suiteResult = testSuite.suiteResults;
  const numFailingTests = suiteResult.numFailingTests;
  const snapshots = testSuite.snapshots;

  const suiteSuccessClass =
    numFailingTests === 0 ? " test-suite--success" : " test-suite--failure";

  const element = xmlBuilder
    .begin()
    .ele("div", { class: `test-suite ${suiteSuccessClass}` });

  const testSuiteTitleDiv = buildTestSuiteTitleDiv(testSuite.testFilePath, testSuite);

  element.importDocument(testSuiteTitleDiv);

  const testResults = element.ele("div", {
    class: "test-suite__results" + suiteSuccessClass,
  });

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

  const headerTextBoxDiv = headerDiv.ele("div", { class: "header__text-box" });

  headerTextBoxDiv.ele("header").ele("h1", { class: "header" }, PAGE_TITLE);

  // Timestamp
  headerTextBoxDiv.ele(
    "div",
    { class: "timestamp" },
    new Date(input.jestData.aggregatedResult.startTime).toLocaleString(),
  );

  const aggregatedResult = input.jestData.aggregatedResult;

  // Test run metadata
  headerTextBoxDiv.ele(
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

  const testSuites: ITestSuite[] = toTestSuites(input);

  const sortedSuites = sortTestSuites(testSuites);

  const testSuiteElements: xmlBuilder.XMLDocument[] = map(
    sortedSuites,
    (testSuite) => buildTestSuiteDiv(testSuite)
  );

  // Sort test suites by failure count and/or HTTP request count

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
