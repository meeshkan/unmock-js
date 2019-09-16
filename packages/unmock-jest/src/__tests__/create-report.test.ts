import createReport from "../reporter/create-report";
import { exampleInput } from "./fake-data";

describe("Report creator", () => {
  it("should create report for given input", () => {
    const created = createReport(exampleInput);
    expect(created).toBeDefined();
  });
});
