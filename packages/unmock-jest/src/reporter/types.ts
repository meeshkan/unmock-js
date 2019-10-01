import { ISnapshot } from "unmock";

export type Redactor = (snapshot: ISnapshot) => ISnapshot;

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
  shortFilePath: string;
  testFilePath: string;
  suiteResults: jest.TestResult;
  snapshots: ISnapshot[];
}
