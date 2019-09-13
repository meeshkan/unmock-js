import createReport from "../reporter/create-report";
import { IJestData, IReportInput } from "../reporter/types";

const aggregatedResult: jest.AggregatedResult = {};

const jestData: IJestData = {
  aggregatedResult,
};

const exampleInput: IReportInput = { jestData, snapshots: [] };

describe("Report creator", () => {
  it("should create report for given input", () => {
    const created = createReport(exampleInput);
    expect(created).toBeDefined();
  });
});
