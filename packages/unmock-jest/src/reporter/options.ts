import * as path from "path";

export const DEFAULT_OUTPUT_DIRECTORY = path.resolve(
  process.cwd(),
  "__unmock__",
);

export const DEFAULT_OUTPUT_FILENAME = "unmock-report.html";

export interface IReporterOptions {
  outputDirectory: string;
  outputFilename: string;
}

const DEFAULT_OPTIONS: IReporterOptions = {
  outputDirectory: DEFAULT_OUTPUT_DIRECTORY,
  outputFilename: DEFAULT_OUTPUT_FILENAME,
};

export const resolveOptions = (reporterOptions: Partial<IReporterOptions>) => ({
  ...DEFAULT_OPTIONS,
  ...reporterOptions,
});
