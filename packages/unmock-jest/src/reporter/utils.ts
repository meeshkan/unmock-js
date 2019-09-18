import { Dictionary, groupBy, mapValues } from "lodash";
import { IReportInput, ITestSuite } from "./types";

export const groupTestsByFilePath = (
  input: IReportInput,
): Dictionary<ITestSuite> => {
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

  const combined = mapValues(testResultByFilePath, (value, filepath) => ({
    suiteResults: value,
    snapshots: snapshotsByFilePath[filepath] || [],
  }));

  return combined;
};
