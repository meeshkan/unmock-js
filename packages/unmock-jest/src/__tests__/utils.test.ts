import { ISnapshot } from "unmock";
import { ITestSuite } from "../reporter/types";
import { sortTestSuites } from "../reporter/utils";

const testSuite1: ITestSuite = {
  testFilePath: "blah",
  suiteResults: {
    numFailingTests: 3,
  } as jest.TestResult,
  snapshots: [],
};

const testSuite2: ITestSuite = {
  testFilePath: "blah2",
  suiteResults: {
    numFailingTests: 2,
  } as jest.TestResult,
  snapshots: [],
};

const testSuite3: ITestSuite = {
  testFilePath: "blah3",
  suiteResults: {
    numFailingTests: 2,
  } as jest.TestResult,
  snapshots: [{} as ISnapshot],
};

describe("Reporter utils", () => {
  describe("sorting test suites", () => {
    it("should sort test suites by number of failing tests", () => {
      expect(sortTestSuites([testSuite1, testSuite2])).toEqual([
        testSuite1,
        testSuite2,
      ]);
      expect(sortTestSuites([testSuite2, testSuite1])).toEqual([
        testSuite1,
        testSuite2,
      ]);
    });
    it("should sort test suites by number of snapshots when matching number of failing tests", () => {
      expect(sortTestSuites([testSuite2, testSuite3])).toEqual([
        testSuite3,
        testSuite2,
      ]);
      expect(sortTestSuites([testSuite2, testSuite3])).toEqual([
        testSuite3,
        testSuite2,
      ]);
    });
  });
});
