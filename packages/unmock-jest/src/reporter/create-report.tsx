import * as React from "react";
import * as ReactDomServer from "react-dom/server";
import xmlBuilder = require("xmlbuilder");
import TestSuites from "./components/test-suites";
import stylesheet from "./stylesheet";
import { IReportInput, ITestSuite } from "./types";
import { sortTestSuites, toTestSuites } from "./utils";

const createHtml = ({ css, body } : { css: string, body: string }) => {
  return `<html>
  <head>
    <meta charset="utf-8">
    <title>Unmock Report</title>
    <link href="https://fonts.googleapis.com/css?family=Lato:100,300,400,700,900" rel="stylesheet" />
    <style type="text/css">${stylesheet}</style>
    <style type="text/css">${css}</style>
  </head>
  <body>
    ${body}
  </body>
</html>`;
}

export const PAGE_TITLE = "Unmock Jest report";

const renderReact = (element: React.ReactElement): string =>
  ReactDomServer.renderToStaticMarkup(element);

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


const buildBodyDiv = (input: IReportInput): [xmlBuilder.XMLDocument, string] => {
  const reportBody = xmlBuilder.begin().element("div", { class: "report" });

  // Header
  reportBody.importDocument(buildHeaderDiv(input));

  const testSuites: ITestSuite[] = sortTestSuites(toTestSuites(input));

  const [css, TestSuitesComponent ] = TestSuites({testSuites });

  reportBody.raw(renderReact(<TestSuitesComponent />));

  return [reportBody, css];
};

export const createReport = (input: IReportInput) => {
  const [body, css] = buildBodyDiv(input);
  const htmlOutput = createHtml({ css, body: body.end() });
  return htmlOutput;
};

export default createReport;
