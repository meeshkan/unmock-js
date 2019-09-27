import "@testing-library/jest-dom/extend-expect";
import { JSDOM } from "jsdom";
import * as React from "react";
import * as ReactDomServer from "react-dom/server";
import TestSuites, { testFileToId } from "../../reporter/components/test-suites";
import { ITestSuite } from "../../reporter/types";
import { toTestSuites } from "../../reporter/utils";
import { readJson } from "../utils";
const jestResults = readJson("resources/jest-results.json");
const unmockSnapshots = readJson("resources/unmock-snapshots.json");

const input = {
    jestData: { aggregatedResult: jestResults },
    snapshots: unmockSnapshots,
};

describe("Test suites component", () => {
    describe("turning file path into id", () => {
        it("should change windows path to proper id", () => {
            expect(testFileToId(`C:\\\\Windows\\Users\\Meeshkan`)).toBe("C--Windows-Users-Meeshkan");
        });
        it("should change unix path to proper id", () => {
            expect(testFileToId("/unix/path/dir/file.txt")).toBe("-unix-path-dir-file-txt");
        });
    });

    describe("rendered component", () => {
        const testSuites: ITestSuite[] = toTestSuites(input);
        const [, TestSuitesComponent] = TestSuites({testSuites });
        const element = ReactDomServer.renderToStaticMarkup(<TestSuitesComponent />);
        const dom = new JSDOM(element);
        it("should have fieldset", () => {
            const fieldset = dom.window.document.querySelector("fieldset");
            expect(fieldset).toBeInTheDocument();
        });
        it("should have two inputs", () => {
            const inputs = dom.window.document.querySelectorAll("input");
            expect(inputs).toHaveLength(2);
        });
        it("should have input with expected id", () => {
            const inputElement = dom.window.document.querySelector("input#box-dsl-test-ts");
            expect(inputElement).toBeDefined();
        });
        it("should have two labels", () => {
            const labels = dom.window.document.querySelectorAll("label");
            expect(labels).toHaveLength(2);
        });
        it("rendered component should have label with expected class", () => {
            const label = dom.window.document.querySelector("label.test-suite-label-dsl-test-ts");
            expect(label).not.toBeNull();
        });
        it("should have two divs for test suite results", () => {
            const divs = dom.window.document.querySelectorAll("div .test-suite");
            expect(divs).toHaveLength(2);
        });
        it("should have div with expected class", () => {
            const div = dom.window.document.querySelector("div.test-suite-dsl-test-ts");
            expect(div).not.toBeNull();
        });
    });
});
