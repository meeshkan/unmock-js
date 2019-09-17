import { forEach, map, mapValues } from "lodash";
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

const buildTestBlock = (
  assertionResult: jest.AssertionResult,
  snapshots: ISnapshot[],
): xmlBuilder.XMLDocument => {
  const testDiv = xmlBuilder.begin().ele("div", { class: "test-suite__test" });
  const testTitle = buildTestTitle(assertionResult);

  testDiv.ele("div", { class: "test-suite__test-title" }, testTitle);
  testDiv.ele(
    "div",
    { class: "test-suite__test-snapshots" },
    `${snapshots.length} snapshot(s)`,
  );
  return testDiv;
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

  const testResults = element.ele(
    "div",
    {
      class: "test-suite__results" + classFlag,
    },
    `Passing: ${numPassingTests}, failing: ${numFailingTests}, snapshots: ${snapshots.length}`,
  );

  const testBlocks: xmlBuilder.XMLDocument[] = map(
    suiteResult.testResults,
    assertionResult => {
      const snapshotsForTest = snapshots.filter(
        snapshot => snapshot.currentTestName === assertionResult.title,
      );
      return buildTestBlock(assertionResult, snapshotsForTest);
    },
  );

  forEach(testBlocks, testBlock => {
    testResults.importDocument(testBlock);
  });

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
