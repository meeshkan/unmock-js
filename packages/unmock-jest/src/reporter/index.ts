import chalk from "chalk";
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

const formatLogString = (writtenFilePath: string): string => {
  return `
${chalk.bold.magentaBright("unmock")}: Wrote report to
${chalk.magenta(writtenFilePath)}`;
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

  public onRunStart() {
    unmockUtils.snapshotter.getOrUpdateSnapshotter().deleteSnapshots();
  }

  public onRunComplete(
    _: Set<jest.Context>,
    results: jest.AggregatedResult,
  ): jest.Maybe<Promise<void>> {
    const writtenFilePath = write({ aggregatedResult: results }, this.options);
    console.log(formatLogString(writtenFilePath)); // tslint:disable-line:no-console
  }
}
