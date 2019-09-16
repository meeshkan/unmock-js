import { ISnapshot, UnmockRequest, UnmockResponse } from "unmock";
import { IJestData, IReportInput } from "../reporter/types";

const testResult: jest.TestResult = {
  console: undefined,
  failureMessage: undefined,
  numFailingTests: 0,
  numPendingTests: 0,
  numPassingTests: 0,
  perfStats: {
    start: 0,
    end: 0,
  },
  skipped: false,
  snapshot: {} as any,
  sourceMaps: {},
  testFilePath: "/path/to/spec.test.ts",
  testResults: [
    {
      ancestorTitles: [],
      failureMessages: [],
      fullName: "Test name",
      numPassingAsserts: 1,
      status: "passed",
      title: "Test title",
    },
  ],
};

export const aggregatedResult: jest.AggregatedResult = {
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
  testResults: [testResult],
};

export const jestData: IJestData = {
  aggregatedResult,
};

export const timestamp = new Date();

export const testRequest: UnmockRequest = {
  method: "get",
  path: "/v3",
  pathname: "/v3",
  host: "api.github.com",
  protocol: "https",
  query: {},
};

export const testResponse: UnmockResponse = {
  statusCode: 200,
  body: "OK",
};

export const exampleSnapshot: ISnapshot = {
  currentTestName: "blah",
  testPath: "fooh",
  timestamp,
  data: {
    req: testRequest,
    res: testResponse,
  },
};

export const snapshots: ISnapshot[] = [exampleSnapshot];

export const exampleInput: IReportInput = { jestData, snapshots };
