import * as fs from "fs";
import * as path from "path";
import { writeToDirectory } from "../reporter/report-writer";

const RANDOM_STRING = Math.random()
  .toString(36)
  .substring(7);

const OUTPUT_FOLDER = path.resolve(__dirname, "output");

describe("Report writer", () => {
  describe("writing to file", () => {
    const testFileName = `${RANDOM_STRING}.html`;
    const testFilePath = path.resolve(OUTPUT_FOLDER, testFileName);

    const deleteTestFile = () => {
      if (fs.existsSync(testFilePath)) {
        fs.unlinkSync(testFilePath);
      }
    };

    beforeEach(() => deleteTestFile());
    afterAll(() => deleteTestFile());

    it("should write contents to the given filename", () => {
      writeToDirectory(RANDOM_STRING, {
        outputDirectory: OUTPUT_FOLDER,
        outputFilename: testFileName,
      });

      const contents = fs.readFileSync(testFilePath, { encoding: "utf-8" });

      expect(contents).toBe(RANDOM_STRING);
    });
  });
});
