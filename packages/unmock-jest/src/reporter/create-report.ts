// @ts-ignore
import { Remarkable } from "remarkable";
import { ISnapshot } from "unmock";
import * as xmlBuilder from "xmlbuilder";
import { IReportInput } from "./types";

const md = new Remarkable();

const createHtmlBase = () => {
  const htmlBase = {
    html: {
      head: {
        meta: { "@charset": "utf-8" },
        title: { "#text": "Unmock report" },
      },
    },
  };

  return xmlBuilder.create(htmlBase);
};

const renderBodyHtml = (_: IReportInput) => md.render("# TITLE ");

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
  const body = renderBodyHtml(input);
  htmlOutput.ele("body").raw(body);
  return htmlOutput.end({ pretty: true });
};

export default createReport;
