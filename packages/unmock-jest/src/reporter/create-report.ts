import { IReportInput } from "./types";

export const createReport = (input: IReportInput) => {
  return JSON.stringify(input.snapshots); // TODO
};

export default createReport;
