import config from "./config";
import ReportGenerator from "./report-generator";

const isRunAsTestResultsProcessor = (globalConfig: any): boolean => {
  /**
   * If the first parameter has a property named 'testResults',
   * the script is being run as a 'testResultsProcessor'.
   * We then need to return the test results as they were received from Jest
   * https://facebook.github.io/jest/docs/en/configuration.html#testresultsprocessor-string
   * Adapted from https://github.com/Hargne/jest-html-reporter/blob/master/src/index.js#L13
   */
  return Object.prototype.hasOwnProperty.call(globalConfig, "testResults");
};

function JestHtmlReporter(globalConfig: any, options: any) {
  if (isRunAsTestResultsProcessor(globalConfig)) {
    // Run as test results processor
    // https://jestjs.io/docs/en/configuration#testresultsprocessor-string
    const generateReport = ReportGenerator(config);
    generateReport.asTestResultsProcessor({
      data: globalConfig,
    });
    return globalConfig;
  }

  // Run as test reporter
  // https://jestjs.io/docs/en/configuration#reporters-array-modulename-modulename-options
  this.jestConfig = globalConfig;
  this.jestOptions = options;

  this.onRunComplete = (contexts, testResult) => {
    // config.setConfigData(this.jestOptions);
    const generateReport = ReportGenerator(config);
    return generateReport.asTestReporter({
      data: testResult,
    });
  };
}

export default JestHtmlReporter;
