import { groupBy, map, mapValues, reverse, sortBy, takeWhile } from "lodash";
import * as path from "path";
import { ISnapshot } from "unmock";
import { IReportInput, ITestSuite, Redactor } from "./types";

export const sortTestSuites = (testSuites: ITestSuite[]): ITestSuite[] => {
  return reverse(
    sortBy(testSuites, [
      testSuite => testSuite.suiteResults.numFailingTests,
      testSuite => testSuite.snapshots.length,
    ]),
  );
};

/**
 * Same as `largestCommonArray` but for two arrays
 * Examples:
 * [["a", "b"], ["a", "c"]] => ["a"]  // First item same
 * [["a", "b"], ["a", "b"]] => ["a", "b"]  // All items same
 * [["a", "c"], ["b", "c"]] => []  // First item does not match
 */
const largestCommonArray2 = <T>(arr1: T[], arr2: T[]): T[] => {
  const [shorter, longer] =
    arr1.length >= arr2.length ? [arr2, arr1] : [arr1, arr2];
  return takeWhile(shorter, (item1, index) => item1 === longer[index]);
};

/**
 * Find the longest common array that all input arrays start with
 * Examples:
 * [["a", "b"], ["a", "c"], ["a", "d"]] => ["a"]  // First item same
 * [["a", "b"], ["a", "b"]] => ["a", "b"]  // All items same
 * [["a", "c"], ["b", "c"]] => []  // First item does not match
 * @param arrays List of arrays
 * @return Longest array that all arrays start with
 */
export const largestCommonArray = <T>(arrays: T[][]): T[] => {
  return arrays.reduce((acc, val) => largestCommonArray2(acc, val));
};

export const REDACTED = "-- redacted --";

export const authRedactor: Redactor = (snapshot: ISnapshot): ISnapshot => {
  const req = snapshot.data.req;

  const redactedReq = {
    ...req,
    headers: {
      ...req.headers,
      ...(req.headers.Authorization ? { Authorization: REDACTED } : {}),
      ...(req.headers.authorization ? { authorization: REDACTED } : {}),
    },
  };

  return {
    ...snapshot,
    data: {
      ...snapshot.data,
      req: redactedReq,
    },
  };
};

export const toTestSuites = (input: IReportInput): ITestSuite[] => {
  const groupedResultsByFilePath = groupBy(
    input.jestData.aggregatedResult.testResults,
    testResult => testResult.testFilePath,
  );

  const testResultByFilePath = mapValues(groupedResultsByFilePath, results => {
    if (results.length > 1) {
      // TODO What does this mean and is this possible?
      throw Error(
        "Did not expect to get multiple test results for a single file",
      );
    }

    return results[0];
  });

  const snapshotsByFilePath = groupBy(
    input.snapshots,
    snapshot => snapshot.testPath,
  );

  // Paths to each test suite's directory as an array
  const paths: string[][] = input.jestData.aggregatedResult.testResults.map(
    testResult => path.dirname(testResult.testFilePath).split(path.sep),
  );

  // Longest path that all test suites' directories start with
  const longestPath = largestCommonArray(paths).join(path.sep) + path.sep;

  const combined = map(testResultByFilePath, (value, filepath) => ({
    shortFilePath: value.testFilePath.replace(longestPath, ""),
    testFilePath: value.testFilePath,
    suiteResults: value,
    snapshots: snapshotsByFilePath[filepath] || [],
  }));

  return combined;
};
