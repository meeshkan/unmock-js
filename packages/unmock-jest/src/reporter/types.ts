import { ISnapshot } from "unmock";

export interface IJestData {
  aggregatedResult: jest.AggregatedResult;
}

export interface IReportInput {
  jestData: IJestData;
  snapshots: ISnapshot[];
}

/**
 * Represents the results for a given **test file**
 */
export interface ITestSuite {
  suiteResults: jest.TestResult;
  snapshots: ISnapshot[];
}
