import { tmpdir as osTmpdir } from "os";
import { resolve as pathResolve } from "path";
import FSSnapshotter from "../loggers/snapshotter";
import { testRequest, testResponse } from "./utils";
const outputFolder = pathResolve(
  __filename,
  "..",
  "__unmock__",
  "__snapshots__",
);

describe("Snapshotter", () => {
  let snapshotter: FSSnapshotter;
  it("should have correct default options when instantiated without options", () => {
    snapshotter = FSSnapshotter.getOrUpdateSnapshotter();
    expect(snapshotter.options.outputFolder).toMatch(osTmpdir());
  });

  it("should respect given options", () => {
    snapshotter = FSSnapshotter.getOrUpdateSnapshotter({
      outputFolder,
    });
    expect(snapshotter.options.outputFolder).toBe(outputFolder);
  });

  it("should snapshot without errors on notify", () => {
    snapshotter = FSSnapshotter.getOrUpdateSnapshotter({
      outputFolder,
    });
    snapshotter.notify({ req: testRequest, res: testResponse });
  });

  it("should be running in Jest", () => {
    expect(FSSnapshotter.runningInJest).toBe(true);
  });
});
