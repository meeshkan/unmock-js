import * as path from "path";

export const DEFAULT_OUTPUT_DIRECTORY = path.resolve(
  process.cwd(),
  "__unmock__",
);

export interface IUnmockJestReporterOptions {
  outputDirectory: string;
}

const DEFAULT_OPTIONS: IUnmockJestReporterOptions = {
  outputDirectory: DEFAULT_OUTPUT_DIRECTORY,
};

export const resolveOptions = (
  reporterOptions: Partial<IUnmockJestReporterOptions>,
) => ({ ...DEFAULT_OPTIONS, ...reporterOptions });
