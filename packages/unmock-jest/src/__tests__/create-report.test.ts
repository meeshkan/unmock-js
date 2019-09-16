// Matchers from jest-dom
import "@testing-library/jest-dom/extend-expect";
import { JSDOM } from "jsdom";
import createReport from "../reporter/create-report";
import { exampleInput } from "./fake-data";

describe("Report creator for given data", () => {
  const report = createReport(exampleInput);
  expect(report).toBeDefined();
  const dom = new JSDOM(report);
  it("should have header", () => {
    const title = dom.window.document.querySelector(".header");
    expect(title).toBeInTheDocument();
  });

  it("should have metadata", () => {
    const metadata = dom.window.document.querySelector(".metadata");
    expect(metadata).toBeInTheDocument();
  });
});
