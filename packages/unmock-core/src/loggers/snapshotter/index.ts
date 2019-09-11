import * as expect from "expect";
import { merge } from "lodash";
import { tmpdir as osTmpdir } from "os";
import { resolve as pathResolve } from "path";
import { IListener, IListenerInput } from "../../interfaces";
import { unmockSnapshot } from "./snapshot";

declare global {
  namespace expect {
    // tslint:disable-next-line:interface-name
    interface Matchers<R> {
      unmockSnapshot(obj: any): R;
    }
  }
}

export interface IFSSnapshotterOptions {
  outputFolder: string;
}

export const DEFAULT_SNAPSHOT_DIRECTORY = pathResolve(
  osTmpdir(), // TODO Resolve if symlink?
  ".unmock-snapshots",
);

const DEFAULT_OPTIONS: IFSSnapshotterOptions = {
  outputFolder: DEFAULT_SNAPSHOT_DIRECTORY,
};

export const resolveOptions = (
  userOptions: Partial<IFSSnapshotterOptions>,
): IFSSnapshotterOptions => {
  return merge({}, DEFAULT_OPTIONS, userOptions);
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
    FSSnapshotter.instance = new FSSnapshotter(newOptions);
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

  public options: IFSSnapshotterOptions;

  private constructor(options?: Partial<IFSSnapshotterOptions>) {
    this.options = resolveOptions(options || {});
    this.extendExpectIfInJest();
  }

  public extendExpectIfInJest() {
    if (!FSSnapshotter.runningInJest) {
      return;
    }
    expect.extend({
      unmockSnapshot: unmockSnapshot(this.options),
    });
  }

  public static get runningInJest() {
    return typeof process.env.JEST_WORKER_ID !== "undefined";
  }

  /**
   * Update options and extend expect with the new options
   * @param options
   */
  public update(options?: Partial<IFSSnapshotterOptions>) {
    this.options = resolveOptions(options || {});
    this.extendExpectIfInJest();
  }

  public notify(input: IListenerInput) {
    if (!FSSnapshotter.runningInJest) {
      return;
    }
    // @ts-ignore
    return expect(input).unmockSnapshot();
  }
}
