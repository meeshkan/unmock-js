import * as path from "path";
import { ISnapshot } from "unmock";
import { IReporterOptions, resolveOptions } from "./options";

export interface IJestData {
  aggregatedResult: jest.AggregatedResult;
}

interface IReportInput {
  jestData: IJestData;
  snapshots: ISnapshot[];
}

export const createReport = (_: IReportInput) => {
  return "";
};

/**
 * Write contents to a file, creating the required directory and destination file.
 */
export const writeToDirectory = (output: string, options: IReporterOptions) => {
  const filepath = path.join(options.outputDirectory, options.outputFilename);
  console.log(`TODO: Write`, output, filepath); // tslint:disable-line:no-console
  return;
};

/**
 * Write Jest report for given snapshots and Jest data.
 */
const writeReport = (input: IReportInput, opts?: Partial<IReporterOptions>) => {
  const options = resolveOptions(opts || {});
  const output: string = createReport(input);
  writeToDirectory(output, options);
};

export default writeReport;
