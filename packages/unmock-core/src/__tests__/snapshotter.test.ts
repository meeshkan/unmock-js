import { resolve as pathResolve } from "path";
import FSSnapshotter from "../loggers/snapshotter";
import { testRequest, testResponse } from "./utils";
const outputFolder = pathResolve(__filename, "..", "__snapshots__");

describe("Snapshotter", () => {
  let snapshotter: FSSnapshotter;

  it("should snapshot on notify", () => {
    snapshotter = FSSnapshotter.getOrUpdateSnapshotter({
      outputFolder,
    });
    const exampleSnapshot = { req: testRequest, res: testResponse };

    snapshotter.notify(exampleSnapshot);

    const snapshots = snapshotter.readSnapshots();
    expect(snapshots.length).toBeGreaterThan(0);
    const snapshot = snapshots[snapshots.length - 1];
    expect(snapshot).toHaveProperty("data", exampleSnapshot);
  });

  it("should delete snapshots", () => {
    snapshotter = FSSnapshotter.getOrUpdateSnapshotter({
      outputFolder,
    });
    const exampleSnapshot = { req: testRequest, res: testResponse };
    snapshotter.notify(exampleSnapshot);
    expect(snapshotter.readSnapshots().length).toBeGreaterThan(0);
    snapshotter.deleteSnapshots();
    expect(snapshotter.readSnapshots()).toHaveLength(0);
  });

  it("should be running in Jest", () => {
    expect(FSSnapshotter.runningInJest).toBe(true);
  });
});
