// Matchers from jest-dom
import "@testing-library/jest-dom/extend-expect";
import { JSDOM } from "jsdom";
import createReport from "../reporter/create-report";
import { exampleInput } from "./fake-data";
describe("Report creator", () => {
  it("should create report for given input", () => {
    const report = createReport(exampleInput);
    expect(report).toBeDefined();
    const dom = new JSDOM(report);
    const title = dom.window.document.querySelector("h1");
    expect(title).toBeInTheDocument();
  });
});
