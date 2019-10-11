import debug from "debug";
import * as expect from "expect";
import * as fs from "fs";
import { merge } from "lodash";
import * as mkdirp from "mkdirp";
import { homedir } from "os";
import { resolve as pathResolve } from "path";
import { IListener, IListenerInput } from "unmock-core";
import { unmockSnapshot } from "./expect-extend";
import {
  FsSnapshotWriterReader,
  ISnapshot,
  ISnapshotWriterReader,
} from "./snapshot-writer-reader";

const debugLog = debug("unmock:snapshotter");

export interface IFsSnapshotterOptions {
  outputFolder: string;
}

export const DEFAULT_SNAPSHOT_DIRECTORY = pathResolve(
  homedir(),
  ".unmock",
  "snapshots",
);

const DEFAULT_OPTIONS: IFsSnapshotterOptions = {
  outputFolder: DEFAULT_SNAPSHOT_DIRECTORY,
};

export { ISnapshot };

export const resolveOptions = (
  userOptions: Partial<IFsSnapshotterOptions>,
): IFsSnapshotterOptions => {
  return merge({}, DEFAULT_OPTIONS, userOptions);
};

const ensureDirExists = (directory: string) => {
  if (!fs.existsSync(directory)) {
    debugLog(`Creating snapshot directory: ${directory}`);
    return mkdirp.sync(directory);
  }

  if (!fs.lstatSync(directory).isDirectory()) {
    throw Error(`Destination exists but is not directory: ${directory}`);
  }

  debugLog(`Directory exists: ${directory}`);

  return;
};

/**
 * Snapshotter to filesystem. Because snapshotting is based
 * on extending `expect` globally, only one singleton instance
 * is allowed to exist.
 */
export default class FsSnapshotter implements IListener {
  /**
   * Build snapshotting listener or update with given options (if exists).
   * Only builds a singleton instance.
   * Creates the output directory.
   * @param newOptions If defined, the existing instance is updated with the given options.
   * If undefined and an instance exists, its options are not changed.
   */
  public static getOrUpdateSnapshotter(
    newOptions?: Partial<IFsSnapshotterOptions>,
  ): FsSnapshotter {
    // Only allow singleton instantiation.
    // Instantiating multiple snapshotters would have unexpected behaviour
    // due to global modifications to expect().unmockSnapshot
    if (typeof FsSnapshotter.instance !== "undefined") {
      if (newOptions) {
        const updatedOptions = resolveOptions(newOptions || {});
        ensureDirExists(updatedOptions.outputFolder);
        FsSnapshotter.instance.update(updatedOptions);
      }
      return FsSnapshotter.instance;
    }

    const options = resolveOptions(newOptions || {});
    ensureDirExists(options.outputFolder);

    FsSnapshotter.instance = new FsSnapshotter(options);
    return FsSnapshotter.instance;
  }

  public static extendExpectIfInJest(writer: ISnapshotWriterReader) {
    if (!FsSnapshotter.runningInJest) {
      return;
    }
    expect.extend({
      unmockSnapshot: unmockSnapshot(writer),
    });
  }

  /**
   * Reset snapshotter behaviour.
   * Note that this affects all existing snapshotters via the global expect.
   * Instantiating new objects will again affect existing snapshotters.
   */
  public static reset() {
    FsSnapshotter.instance = undefined;
    FsSnapshotter.removeExtendExpect();
  }

  public static removeExtendExpect() {
    expect.extend({
      unmockSnapshot() {}, // tslint:disable-line:no-empty
    });
  }

  private static instance?: FsSnapshotter;

  private writer: ISnapshotWriterReader;

  private constructor(options: IFsSnapshotterOptions) {
    this.writer = new FsSnapshotWriterReader(options.outputFolder);
    FsSnapshotter.extendExpectIfInJest(this.writer);
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
  public update(newOptions: IFsSnapshotterOptions) {
    this.writer = new FsSnapshotWriterReader(newOptions.outputFolder);
    FsSnapshotter.extendExpectIfInJest(this.writer);
  }

  public notify(input: IListenerInput) {
    if (!FsSnapshotter.runningInJest) {
      return;
    }
    // @ts-ignore
    return expect(input).unmockSnapshot();
  }
}
