import * as path from "path";
import { Redactor } from "./types";

export const DEFAULT_OUTPUT_DIRECTORY = path.resolve(
  process.cwd(),
  "__unmock__",
);

export const DEFAULT_OUTPUT_FILENAME = "unmock-report.html";

export interface IReporterOptions {
  outputDirectory: string;
  outputFilename: string;
  redactor: Redactor;
}

const authRedactor: Redactor = (req, res) => ({
  req: {
    ...req,
    headers: {
      ...res.headers,
      ...(res.headers.Authorization ? { Authorization: "-- redacted --" } : {}),
      ...(res.headers.authorization ? { authorization: "-- redacted --" } : {}),
    },
  },
  res,
});

const DEFAULT_OPTIONS: IReporterOptions = {
  outputDirectory: DEFAULT_OUTPUT_DIRECTORY,
  outputFilename: DEFAULT_OUTPUT_FILENAME,
  redactor: authRedactor,
};

export const resolveOptions = (reporterOptions: Partial<IReporterOptions>) => ({
  ...DEFAULT_OPTIONS,
  ...reporterOptions,
});
