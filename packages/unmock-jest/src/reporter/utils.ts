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

export const longestCommonString = (strings: string[]): string => {
  return strings.reduce((acc, val) => {
    let longest = "";
    for (let i = 0; i < acc.length; i++) {
      const tried = acc.substring(0, i);
      if (val.startsWith(tried)) {
        longest = tried;
        continue;
      } else {
        break;
      }
    }
    return longest;
  });
};

export const longestCommonPath = (paths: string[][]): string[] => {
  return paths.reduce((acc, val) => {
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

  const longestPath = longestCommonPath(paths).join(path.sep);

  const combined = map(testResultByFilePath, (value, filepath) => ({
    testFilePath: value.testFilePath.replace(longestPath, ""),
    suiteResults: value,
    snapshots: snapshotsByFilePath[filepath] || [],
  }));

  return combined;
};
