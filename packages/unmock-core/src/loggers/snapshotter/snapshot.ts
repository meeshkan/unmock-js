import debug from "debug";
import * as expect from "expect";
import * as fs from "fs";
import { IFSSnapshotterOptions } from ".";
import { IListenerInput } from "../../interfaces";

const debugLog = debug("unmock-core:snapshotter");

const MATCHER_PASS = { pass: true };

/**
 * Retuns a snapshotter attachable to `expect.extend`.
 * Checks if the destination directory is writable.
 * If not, fails silently.
 */
export const unmockSnapshot = (options: IFSSnapshotterOptions) => {
  const outputFolder = options.outputFolder;

  const isWritable =
    fs.existsSync(outputFolder) &&
    fs.lstatSync(outputFolder).isDirectory() &&
    fs.accessSync(outputFolder, fs.constants.W_OK);

  return function(this: expect.MatcherState, obj: IListenerInput) {
    if (!isWritable) {
      debugLog(`Cannot write to ${outputFolder}, skipping snapshotting`);
      return MATCHER_PASS;
    }
    debugLog("Snapshotting:", {
      outputFolder: options.outputFolder,
      testPath: this.testPath,
      currentTestName: this.currentTestName,
      obj,
    });

    return MATCHER_PASS;
  };
};

expect.addSnapshotSerializer({
  print: (val: any) => JSON.stringify(val, undefined, 2),
  // Smoke test for a value that is a request-response pair
  test: (val: any) => val.req && val.req.method,
});
