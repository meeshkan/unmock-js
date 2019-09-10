// tslint:disable:no-console
// tslint:disable:no-unused-vars
// tslint:disable:no-empty
// Run as test reporter
// https://jestjs.io/docs/en/configuration#reporters-array-modulename-modulename-options
export default class UnmockJestTestReporter implements jest.Reporter {
  constructor(public globalConfig: jest.GlobalConfig, public options: any) {}

  public onRunStart(
    // @ts-ignore
    results: jest.AggregatedResult,
    // @ts-ignore
    options: jest.ReporterOnStartOptions,
  ) {
    console.log("onRunStart");
    throw Error("Reporter error");
  }

  public onRunComplete(
    contexts: Set<jest.Context>,
    results: jest.AggregatedResult,
  ): jest.Maybe<Promise<void>> {
    console.log("Custom reporter output:");
    console.log("GlobalConfig: ", this.globalConfig);
    console.log("Options: ", this.options);
    console.log("Contexts", contexts);
    console.log("Results", results);
  }

  public onTestResult(
    test: jest.Test,
    // @ts-ignore
    testResult: jest.TestResult,
    // @ts-ignore
    aggregatedResult: jest.AggregatedResult,
  ): void {
    console.log("onTestResult", test);
  }

  public onTestStart(
    // @ts-ignore
    test: jest.Test,
  ): void {}

  public getLastError(): jest.Maybe<Error> {}
}
