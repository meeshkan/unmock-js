import { ISnapshot } from "unmock";
import { IReportInput } from "./types";

const buildBody = (input: IReportInput): string => {
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
  const body = buildBody(input);
  return `
<!DOCTYPE html>
  <html>
    <head>
      <title>
        Unmock Report
      </title>
    </head>
    <body>
      ${body}
    </body>
  </html>`;
};

export default createReport;
