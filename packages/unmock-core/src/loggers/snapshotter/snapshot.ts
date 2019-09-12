import debug from "debug";
import * as expect from "expect";
import { IFSSnapshotterOptions } from ".";
import { IListenerInput } from "../../interfaces";

const debugLog = debug("unmock-core:snapshotter");

export const unmockSnapshot = (options: IFSSnapshotterOptions) => {
  // TODO Ensure destination exists and is writable
  return function(this: expect.MatcherState, obj: IListenerInput) {
    debugLog("Snapshotting:", {
      outputFolder: options.outputFolder,
      testPath: this.testPath,
      currentTestName: this.currentTestName,
      obj,
    });
    return {
      pass: true,
    };
  };
};

expect.addSnapshotSerializer({
  print: (val: any) => JSON.stringify(val, undefined, 2),
  // Smoke test for a value that is a request-response pair
  test: (val: any) => val.req && val.req.method,
});
