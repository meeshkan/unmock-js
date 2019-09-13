import * as fs from "fs";
import * as path from "path";
import { writeToDirectory } from "../reporter/write-report";

const RANDOM_STRING = Math.random()
  .toString(36)
  .substring(7);

const OUTPUT_FOLDER = path.resolve(__dirname, "output");

describe("Report writer", () => {
  describe("writing to file", () => {
    const TEST_FILE_NAME = `${RANDOM_STRING}.html`;
    const TEST_FILE_PATH = path.resolve(OUTPUT_FOLDER, TEST_FILE_NAME);

    const deleteTestFile = () => {
      if (fs.existsSync(TEST_FILE_PATH)) {
        fs.unlinkSync(TEST_FILE_PATH);
      }
    };

    beforeEach(() => deleteTestFile());
    afterAll(() => deleteTestFile());

    it("should write contents to the given filename", () => {
      writeToDirectory(RANDOM_STRING, {
        outputDirectory: OUTPUT_FOLDER,
        outputFilename: TEST_FILE_NAME,
      });

      const contents = fs.readFileSync(TEST_FILE_PATH, { encoding: "utf-8" });
      expect(contents).toBe(RANDOM_STRING);
    });
  });
});
