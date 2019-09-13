import { resolve as pathResolve } from "path";
import FsSnapshotter from "../loggers/snapshotter";
import {
  format,
  FsSnapshotWriterReader,
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

  describe("writing and reading", () => {
    const snapshotWriterReader = new FsSnapshotWriterReader(outputFolder);

    beforeAll(() => {
      snapshotWriterReader.deleteSnapshots();
    });

    afterEach(() => {
      snapshotWriterReader.deleteSnapshots();
    });

    it("should write to expected folder", () => {
      expect(snapshotWriterReader.read()).toHaveLength(0);

      snapshotWriterReader.write(exampleSnapshotInput);

      const snapshotFiles = snapshotWriterReader.findSnapshotFiles();
      expect(snapshotFiles).toHaveLength(1);
      expect(snapshotFiles[0]).toMatch(new RegExp(`^${outputFolder}`));
    });

    it("should sort inputs by date when reading", () => {
      expect(snapshotWriterReader.read()).toHaveLength(0);

      const exampleSnapshotInputWithEarlyTimestamp = {
        ...exampleSnapshotInput,
        timestamp: new Date(0),
      };

      snapshotWriterReader.write(exampleSnapshotInput);
      snapshotWriterReader.write(exampleSnapshotInputWithEarlyTimestamp);

      const parsedSnapshots = snapshotWriterReader.read();
      expect(parsedSnapshots).toHaveLength(2);
      expect(parsedSnapshots[0]).toEqual(
        exampleSnapshotInputWithEarlyTimestamp,
      );
      expect(parsedSnapshots[1]).toEqual(exampleSnapshotInput);
    });
  });
});
