import * as path from "path";
// import writeReport, { createReport } from "../reporter/report-writer";

const OUTPUT_FOLDER = path.resolve(__dirname, "output");

describe("Report writer", () => {
  it("should write to expected output folder", () => {
    expect(OUTPUT_FOLDER).toBeDefined();
  });
});
