// tslint:disable:no-console
import { utils } from "unmock";
import { IUnmockJestReporterOptions, resolveOptions } from "./options";

// https://jestjs.io/docs/en/configuration#reporters-array-modulename-modulename-options
export default class UnmockJestReporter implements jest.Reporter {
  public readonly rootDir: string;
  public readonly options: IUnmockJestReporterOptions;
  constructor(
    public globalConfig: jest.GlobalConfig,
    public reporterOptions: Partial<IUnmockJestReporterOptions>,
  ) {
    this.options = resolveOptions(reporterOptions);
    this.rootDir = globalConfig.rootDir;
  }

  public onRunStart(
    results: jest.AggregatedResult,
    options: jest.ReporterOnStartOptions,
  ) {
    console.log("onRunStart");
    console.log("results", results);
    console.log("reporterOnStartOptions", options);
    console.log("Options", this.options);
  }

  public onRunComplete(
    contexts: Set<jest.Context>,
    results: jest.AggregatedResult,
  ): jest.Maybe<Promise<void>> {
    console.log("onRunComplete");
    console.log("Contexts", contexts);
    console.log("Results", results);
    const snapshots = utils.snapshotter
      .getOrUpdateSnapshotter()
      .readSnapshots();
    console.log(`Snapshots: ${JSON.stringify(snapshots)}`);
  }

  public onTestResult(
    test: jest.Test,
    testResult: jest.TestResult,
    aggregatedResult: jest.AggregatedResult,
  ): void {
    console.log("onTestResult", test, testResult, aggregatedResult);
  }

  public onTestStart(test: jest.Test): void {
    console.log("onTestStart", test);
  }
}
