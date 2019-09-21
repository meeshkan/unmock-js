import { testFileToId } from "../../reporter/components/test-suites";

describe("Test suites component", () => {
    describe("turning file path into id", () => {
        it("should change windows path to proper id", () => {
            expect(testFileToId(`C:\\\\Windows\\Users\\Meeshkan`)).toBe("C--Windows-Users-Meeshkan");
        });
        it("should change unix path to proper id", () => {
            expect(testFileToId("/unix/path/dir")).toBe("-unix-path-dir");
        });
    });
});
