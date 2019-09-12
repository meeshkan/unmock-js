import { resolve as pathResolve } from "path";
import FsSnapshotter from "../loggers/snapshotter";
import { testRequest, testResponse } from "./utils";
const outputFolder = pathResolve(__filename, "..", "__snapshots__");

describe("Snapshotter", () => {
  let snapshotter: FsSnapshotter;

  it("should snapshot on notify and read it", () => {
    snapshotter = FsSnapshotter.getOrUpdateSnapshotter({
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
    snapshotter = FsSnapshotter.getOrUpdateSnapshotter({
      outputFolder,
    });
    const exampleSnapshot = { req: testRequest, res: testResponse };

    snapshotter.notify(exampleSnapshot);
    expect(snapshotter.readSnapshots().length).toBeGreaterThan(0);

    snapshotter.deleteSnapshots();
    expect(snapshotter.readSnapshots()).toHaveLength(0);
  });

  it("should be running in Jest", () => {
    expect(FsSnapshotter.runningInJest).toBe(true);
  });

  afterEach(() => {
    snapshotter.deleteSnapshots();
    snapshotter = FsSnapshotter.getOrUpdateSnapshotter({}); // Back to default
  });
});
