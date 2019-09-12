import debug from "debug";
import * as expect from "expect";
import * as fs from "fs";
import { merge } from "lodash";
import { tmpdir as osTmpdir } from "os";
import { resolve as pathResolve } from "path";
import { IListener, IListenerInput } from "../../interfaces";
import { unmockSnapshot } from "./snapshot";
import {
  ISnapshotWriterReader,
  SnapshotWriterReader,
  ISnapshot,
} from "./snapshot-writer-reader";

const debugLog = debug("unmock:snapshotter");

export interface IFSSnapshotterOptions {
  outputFolder: string;
}

export const DEFAULT_SNAPSHOT_DIRECTORY = pathResolve(
  osTmpdir(), // TODO Resolve if symlink?
  ".unmock",
);

const DEFAULT_OPTIONS: IFSSnapshotterOptions = {
  outputFolder: DEFAULT_SNAPSHOT_DIRECTORY,
};

export const resolveOptions = (
  userOptions: Partial<IFSSnapshotterOptions>,
): IFSSnapshotterOptions => {
  return merge({}, DEFAULT_OPTIONS, userOptions);
};

const ensureDirExists = (directory: string) => {
  if (!fs.existsSync(directory)) {
    debugLog(`Creating snapshot directory: ${directory}`);
    return fs.mkdirSync(directory); // TODO Catch
  }

  if (!fs.lstatSync(directory).isDirectory()) {
    throw Error(`Destination exists but is not directory: ${directory}`);
  }

  return;
};

/**
 * Snapshotter to filesystem. Because snapshotting is based
 * on extending `expect` globally, only one singleton instance
 * is allowed to exist.
 */
export default class FSSnapshotter implements IListener {
  /**
   * Build snapshotting listener or update with given options (if exists).
   * Only builds a singleton instance.
   * Creates the output directory.
   * @param newOptions If defined, the existing instance is updated with the given options.
   * If undefined and an instance exists, its options are not changed.
   */
  public static getOrUpdateSnapshotter(
    newOptions?: Partial<IFSSnapshotterOptions>,
  ): FSSnapshotter {
    // Only allow singleton instantiation.
    // Instantiating multiple snapshotters would have unexpected behaviour
    // due to global modifications to expect().unmockSnapshot
    if (typeof FSSnapshotter.instance !== "undefined") {
      if (newOptions) {
        FSSnapshotter.instance.update(newOptions);
      }
      return FSSnapshotter.instance;
    }
    const options = resolveOptions(newOptions || {});

    ensureDirExists(options.outputFolder);

    FSSnapshotter.instance = new FSSnapshotter(options);
    return FSSnapshotter.instance;
  }

  /**
   * Reset snapshotter behaviour.
   * Note that this affects all existing snapshotters via the global expect.
   * Instantiating new objects will again affect existing snapshotters.
   */
  public static reset() {
    FSSnapshotter.instance = undefined;
    FSSnapshotter.removeExtendExpect();
  }

  public static removeExtendExpect() {
    expect.extend({
      unmockSnapshot() {}, // tslint:disable-line:no-empty
    });
  }

  private static instance?: FSSnapshotter;

  private writer: ISnapshotWriterReader;

  private constructor(options: IFSSnapshotterOptions) {
    this.writer = new SnapshotWriterReader(options.outputFolder);
    this.extendExpectIfInJest(this.writer);
  }

  public extendExpectIfInJest(writer: ISnapshotWriterReader) {
    if (!FSSnapshotter.runningInJest) {
      return;
    }
    expect.extend({
      unmockSnapshot: unmockSnapshot(writer),
    });
  }

  public static get runningInJest() {
    return typeof process.env.JEST_WORKER_ID !== "undefined";
  }

  public readSnapshots(): ISnapshot[] {
    return this.writer.read();
  }

  public deleteSnapshots(): void {
    return this.writer.deleteSnapshots();
  }

  /**
   * Update options and extend expect with the new options
   * @param newOptions
   */
  public update(newOptions?: Partial<IFSSnapshotterOptions>) {
    const options = resolveOptions(newOptions || {});
    this.writer = new SnapshotWriterReader(options.outputFolder);
    this.extendExpectIfInJest(this.writer);
  }

  public notify(input: IListenerInput) {
    if (!FSSnapshotter.runningInJest) {
      return;
    }
    // @ts-ignore
    return expect(input).unmockSnapshot();
  }
}
