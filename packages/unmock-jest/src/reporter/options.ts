import * as path from "path";

export interface IUnmockJestReporterOptions {
  outputDirectory: string;
}

const DEFAULT_OPTIONS: IUnmockJestReporterOptions = {
  outputDirectory: path.resolve(process.cwd(), "__unmock__"),
};

export const resolveOptions = (
  reporterOptions: Partial<IUnmockJestReporterOptions>,
) => ({ ...DEFAULT_OPTIONS, ...reporterOptions });
