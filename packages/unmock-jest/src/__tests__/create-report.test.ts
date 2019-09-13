import createReport from "../reporter/create-report";
import { IJestData, IReportInput } from "../reporter/types";

const aggregatedResult: jest.AggregatedResult = {
  numFailedTests: 0,
  numPassedTests: 0,
  numPendingTestSuites: 0,
  numRuntimeErrorTestSuites: 0,
  numTodoTests: 0,
  numTotalTests: 0,
  numFailedTestSuites: 0,
  numPassedTestSuites: 0,
  numTotalTestSuites: 0,
  numPendingTests: 0,
  snapshot: {} as jest.SnapshotSummary, // Don't care about these
  startTime: 0,
  success: true,
  wasInterrupted: false,
  testResults: [],
};

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
