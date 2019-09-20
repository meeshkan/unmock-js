import { ISnapshot } from "unmock";
import { ITestSuite } from "../reporter/types";
import { largestCommonArray, sortTestSuites } from "../reporter/utils";

const testSuite1: ITestSuite = {
  shortFilePath: "blah",
  testFilePath: "blah",
  suiteResults: {
    numFailingTests: 3,
  } as jest.TestResult,
  snapshots: [],
};

const testSuite2: ITestSuite = {
  shortFilePath: "blah2",
  testFilePath: "blah2",
  suiteResults: {
    numFailingTests: 2,
  } as jest.TestResult,
  snapshots: [],
};

const testSuite3: ITestSuite = {
  shortFilePath: "blah3",
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
  describe("Finding longest array in common", () => {
    it("should return the whole array when only single array given", () => {
      const result = largestCommonArray([["dir", "stuff"]]);
      expect(result).toEqual(["dir", "stuff"]);
    });
    it("should return the whole array when all items match", () => {
      const result = largestCommonArray([["dir", "stuff"], ["dir", "stuff"]]);
      expect(result).toEqual(["dir", "stuff"]);
    });
    it("should return the two first items when they match", () => {
      const result = largestCommonArray([
        ["dir", "stuff", "baz"],
        ["dir", "stuff"],
      ]);
      expect(result).toEqual(["dir", "stuff"]);
    });
    it("should only return the first when the first matches", () => {
      const result = largestCommonArray([["dir", "stuff"], ["dir", "baz"]]);
      expect(result).toEqual(["dir"]);
    });
    it("should return an empty array when first item is different", () => {
      const result = largestCommonArray([["dir", "stuff"], ["dir2", "stuff"]]);
      expect(result).toEqual([]);
    });
  });
});
