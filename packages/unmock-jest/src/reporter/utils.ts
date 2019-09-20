import { groupBy, map, mapValues, reverse, sortBy } from "lodash";
import * as path from "path";
import { IReportInput, ITestSuite } from "./types";

export const sortTestSuites = (testSuites: ITestSuite[]): ITestSuite[] => {
  return reverse(
    sortBy(testSuites, [
      testSuite => testSuite.suiteResults.numFailingTests,
      testSuite => testSuite.snapshots.length,
    ]),
  );
};

/**
 * Find the longest common items for a list of arrays
 * Examples:
 * [["a", "b"], ["a", "c"]] => ["a"]
 * [["a", "b"], ["a", "b"]] => ["a", "b"]
 * [["a", "c"], ["b", "c"]] => []
 * @param arrays List of arrays
 * @return Longest array that all arrays start with
 */
export const largestCommonArray = <T>(arrays: T[][]): T[] => {
  return arrays.reduce((acc, val) => {
    let commonItems = 0;
    for (let i = 0; i < acc.length; i++) {
      if (acc[i] === val[i]) {
        commonItems = i + 1;
      } else {
        break;
      }
    }
    return acc.slice(0, commonItems);
  });
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

  const paths = input.jestData.aggregatedResult.testResults.map(testResult =>
    path.dirname(testResult.testFilePath).split(path.sep),
  );

  const longestPath = largestCommonArray(paths).join(path.sep);

  const combined = map(testResultByFilePath, (value, filepath) => ({
    testFilePath: value.testFilePath.replace(longestPath, ""),
    suiteResults: value,
    snapshots: snapshotsByFilePath[filepath] || [],
  }));

  return combined;
};
