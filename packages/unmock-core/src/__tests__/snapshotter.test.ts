import { resolve as pathResolve } from "path";
import FsSnapshotter from "../loggers/snapshotter";
import {
  format,
  ISnapshot,
  parseSnapshot,
} from "../loggers/snapshotter/snapshot-writer-reader";
import { testRequest, testResponse } from "./utils";
const outputFolder = pathResolve(__filename, "..", "__snapshots__");

const exampleListenerInput = { req: testRequest, res: testResponse };

describe("Snapshotter", () => {
  let snapshotter: FsSnapshotter;

  it("should snapshot on notify and read it", () => {
    snapshotter = FsSnapshotter.getOrUpdateSnapshotter({
      outputFolder,
    });

    snapshotter.notify(exampleListenerInput);

    const snapshots = snapshotter.readSnapshots();
    expect(snapshots.length).toBeGreaterThan(0);
    const snapshot = snapshots[snapshots.length - 1];
    expect(snapshot).toHaveProperty("data", exampleListenerInput);
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

const timestamp = new Date();

const exampleSnapshotInput: ISnapshot = {
  currentTestName: "blah",
  data: exampleListenerInput,
  testPath: "blah",
  timestamp,
};

describe("Snapshot writer/reader", () => {
  describe("formatting and parsing", () => {
    it("should format timestamp as ISO string", () => {
      const formatted = format(exampleSnapshotInput);
      expect(formatted).toContain(timestamp.toISOString());
    });
    it("should parse the same object from formatted object", () => {
      const formatted = format(exampleSnapshotInput);
      const parsed = parseSnapshot(formatted);
      expect(parsed).toEqual(exampleSnapshotInput);
    });
  });
});
