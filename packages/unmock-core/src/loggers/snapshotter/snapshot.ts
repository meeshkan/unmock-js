import debug from "debug";
import * as expect from "expect";
import * as fs from "fs";
import { IFSSnapshotterOptions } from ".";
import { IListenerInput } from "../../interfaces";

const debugLog = debug("unmock-core:snapshotter");

const MATCHER_PASS = { pass: true };

export const unmockSnapshot = (options: IFSSnapshotterOptions) => {
  // TODO Ensure destination exists and is writable

  const outputFolder = options.outputFolder;

  const exists =
    !fs.existsSync(outputFolder) && fs.lstatSync(outputFolder).isDirectory();

  let canWrite = true;

  if (!exists) {
    try {
      fs.mkdirSync(outputFolder);
    } catch (err) {
      canWrite = false;
      throw Error(
        `Failed creating directory: ${outputFolder}, err: ${err.message}`,
      );
    }
  }

  return function(this: expect.MatcherState, obj: IListenerInput) {
    if (!canWrite) {
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
