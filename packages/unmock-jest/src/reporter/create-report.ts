// @ts-ignore
// import { Remarkable } from "remarkable";
import { ISnapshot } from "unmock";
import * as xmlBuilder from "xmlbuilder";
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

const renderBody = (input: IReportInput): string => {
  const reportBody = xmlBuilder
    .begin()
    .element("div", { id: "report-content" });

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
