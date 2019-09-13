// tslint:disable:no-console
import { utils as unmockUtils } from "unmock";
import { IReporterOptions, resolveOptions } from "./options";
import { IJestData } from "./types";
import writeReport from "./write-report";

/**
 * Write report from Jest test results, loading snapshots, building report and writing to file.
 * @param jestData Jest test result
 */
export const write = (jestData: IJestData, options: IReporterOptions) => {
  const snapshots = unmockUtils.snapshotter
    .getOrUpdateSnapshotter()
    .readSnapshots();
  return writeReport({ jestData, snapshots }, options);
};

// https://jestjs.io/docs/en/configuration#reporters-array-modulename-modulename-options
export default class UnmockJestReporter implements jest.Reporter {
  public readonly rootDir: string;
  public readonly options: IReporterOptions;
  constructor(
    public globalConfig: jest.GlobalConfig,
    public reporterOptions: Partial<IReporterOptions>,
  ) {
    this.options = resolveOptions(reporterOptions);
    this.rootDir = globalConfig.rootDir;
  }

  public onRunComplete(
    _: Set<jest.Context>,
    results: jest.AggregatedResult,
  ): jest.Maybe<Promise<void>> {
    return write({ aggregatedResult: results }, options);
  }
}
