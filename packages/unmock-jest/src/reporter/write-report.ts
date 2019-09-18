import debug from "debug";
import * as fs from "fs";
import * as path from "path";
import createReport from "./create-report";
import { IReporterOptions, resolveOptions } from "./options";
import { IReportInput } from "./types";

const debugLog = debug("unmock-jest:writer");

/**
 * Write contents to a file, creating the required directory and destination file.
 * If the destination directory does not exists, creates the directory (not recursively).
 * @returns Absolute path to the written file.
 */
export const writeToDirectory = (
  contents: string,
  options: IReporterOptions
): string => {
  const filepath = path.join(options.outputDirectory, options.outputFilename);

  const absoluteFilePath = path.isAbsolute(filepath)
    ? filepath
    : path.resolve(process.cwd(), filepath);

  const dirname = path.dirname(absoluteFilePath);

  if (!fs.existsSync(dirname)) {
    debugLog(`Creating directory: ${dirname}`);
    try {
      fs.mkdirSync(dirname);
    } catch (err) {
      throw Error(`Failed creating directory: ${dirname}`);
    }
  }

  debugLog(`Writing to: ${absoluteFilePath}`);
  fs.writeFileSync(absoluteFilePath, contents);
  return absoluteFilePath;
};

/**
 * Write Jest report for given snapshots and Jest data.
 * @returns Path to the written file.
 */
const writeReport = (input: IReportInput, opts: IReporterOptions) => {
  const options = resolveOptions(opts || {});
  const report: string = createReport(input);
  return writeToDirectory(report, options);
};

export default writeReport;
