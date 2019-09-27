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

    describe("rendering", () => {
        const testSuites: ITestSuite[] = toTestSuites(input);
        it("example test", () => {
            const [css, TestSuitesComponent] = TestSuites({testSuites });
            expect(testSuites).toHaveLength(2);
        });
    });
});
