// @ts-ignore
// import { Remarkable } from "remarkable";
import { Dictionary, forEach, groupBy, map } from "lodash";
import { ISnapshot } from "unmock";
import xmlBuilder = require("xmlbuilder");
import { IReportInput } from "./types";

// const md = new Remarkable();
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

const sortTests = (input: IReportInput): Dictionary<jest.TestResult[]> => {
  const groupedByFilePath = groupBy(
    input.jestData.aggregatedResult.testResults,
    "testFilePath",
  );
  return groupedByFilePath;
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

  const testSuites = reportBody.ele("div", { class: "test-results" });

  const grouped = sortTests(input);

  const testSuitesNodes = map(grouped, (_, filename) =>
    xmlBuilder.begin().ele("p", filename),
  );

  forEach(testSuitesNodes, value => {
    const block = testSuites.ele("div");
    block.importDocument(value);
  });

  return reportBody.end({ pretty: true });
};

export const buildBody = (input: IReportInput): string => {
  const snapshots: ISnapshot[] = input.snapshots;

  const snapshotHeaders = `
<tr>
  <th>
    Timestamp
  </th>
  <th>
    Test name
  </th>
  <th>
    Request host
  </th>
</tr>`;
  const snapshotRows = snapshots.map(snapshot => {
    return `
<tr>
  <td>
    ${snapshot.timestamp.toISOString()}
  </td>
  <td>
    ${snapshot.currentTestName}
  </td>
  <td>
    ${snapshot.data.req.host}
  </td>
</tr>`;
  });

  return `
<table>
  <tbody>
    ${snapshotHeaders}${snapshotRows.join("")}
  </tbody>
</table>`;
};

export const createReport = (input: IReportInput) => {
  const htmlOutput = createHtmlBase();
  const body = renderBody(input);
  htmlOutput.ele("body").raw(body);
  return htmlOutput.end({ pretty: true });
};

export default createReport;
