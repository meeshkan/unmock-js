import { Dictionary, forEach, groupBy, mapValues } from "lodash";
import { ISnapshot } from "unmock";
import xmlBuilder = require("xmlbuilder");
import { IReportInput } from "./types";

const stylesheet = `
h1 {
  font-size: 16px;
}`;

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
  testResults: jest.TestResult[];
  snapshots: ISnapshot[];
}

const sortTests = (input: IReportInput): Dictionary<ITestSuite> => {
  const testResultsByFilePath = groupBy(
    input.jestData.aggregatedResult.testResults,
    testResult => testResult.testFilePath,
  );

  const snapshotsByFilePath = groupBy(
    input.snapshots,
    snapshot => snapshot.testPath,
  );

  const sorted = mapValues(testResultsByFilePath, (value, key) => ({
    testResults: value,
    snapshots: snapshotsByFilePath[key] || [],
  }));

  return sorted;
};

const createTestSuiteNode = (
  filename: string,
  testSuite: ITestSuite,
): xmlBuilder.XMLDocument => {
  const element = xmlBuilder.begin().ele("div", { class: "test-suite" });
  element.ele("p", {}, filename);
  element.ele("p", {}, JSON.stringify(testSuite));
  return element;
};

const renderBody = (input: IReportInput): string => {
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

  const grouped = sortTests(input);

  const testSuitesNodes = mapValues(grouped, (testResults, filename) =>
    createTestSuiteNode(filename, testResults),
  );

  forEach(testSuitesNodes, value => {
    const block = testResultsElement.ele("div", { class: "test-suite" });
    block.importDocument(value);
  });

  return reportBody.end({ pretty: true });
};

export const createReport = (input: IReportInput) => {
  const htmlOutput = createHtmlBase();
  const body = renderBody(input);
  htmlOutput.ele("body").raw(body);
  return htmlOutput.end({ pretty: true });
};

export default createReport;
