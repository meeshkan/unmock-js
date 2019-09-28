import "@testing-library/jest-dom/extend-expect";
import { JSDOM } from "jsdom";
import * as React from "react";
import * as ReactDomServer from "react-dom/server";
import TestSuites, { testFileToId } from "../../reporter/components/test-suites";
import stylesheet from "../../reporter/stylesheet";
import { ITestSuite } from "../../reporter/types";
import { toTestSuites } from "../../reporter/utils";
import { readJson } from "../utils";
import { authRedactor } from "../../reporter/options";

const jestResults = readJson("resources/jest-results.json");
const unmockSnapshots = readJson("resources/unmock-snapshots.json");

const input = {
    jestData: { aggregatedResult: jestResults },
    snapshots: unmockSnapshots,
};

const renderTestSuites = () => {
    const testSuites: ITestSuite[] = toTestSuites(input);
    const [css, TestSuitesComponent] = TestSuites({testSuites, redactor: authRedactor });
    const element = ReactDomServer.renderToStaticMarkup(<TestSuitesComponent />);
    // Small hack to include stylesheets in the DOM
    const html = `<!DOCTYPE html><html><head><style>${stylesheet}</style><style>${css}</style></head><body>${element}</body></html>`;
    const dom = new JSDOM(html);
    return dom;
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
        const dom = renderTestSuites();
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
        it("should have label with expected class", () => {
            const label = dom.window.document.querySelector("label.test-suite-label-dsl-test-ts");
            expect(label).not.toBeNull();
        });
        it("should have label with expected opacities", () => {
            /**
             * These tests break easily but they're there to check that the radio checker works!
             */
            const label = dom.window.document.querySelector("label.test-suite-label-dsl-test-ts");
            expect(label).not.toBeNull();
            expect(label).toHaveStyle("opacity: 1");
            const label2 = dom.window.document.querySelector("label.test-suite-label-basic-test-ts");
            expect(label2).not.toBeNull();
            expect(label2).toHaveStyle("opacity: 0.7");
        });
        it("should have two divs for test suite results", () => {
            const divs = dom.window.document.querySelectorAll("div .test-suite");
            expect(divs).toHaveLength(2);
        });
        it("should have first div with expected class and it be visible", () => {
            const div = dom.window.document.querySelector("div.test-suite-dsl-test-ts");
            expect(div).not.toBeNull();
            expect(div).toHaveStyle("display: block");
        });
        it("should have as second div a hidden block", () => {
            const div = dom.window.document.querySelector("div.test-suite-basic-test-ts");
            expect(div).toHaveStyle("display: none");
        });
    });
});
