import debug from "debug";
import * as expect from "expect";
import { IListenerInput } from "../../interfaces";
import { ISnapshotWriterReader } from "./snapshot-writer-reader";

const debugLog = debug("unmock-core:snapshotter");

const MATCHER_PASS = { pass: true };

/**
 * Retuns a snapshotter attachable to `expect.extend`.
 * Checks if the destination directory is writable.
 * If not, fails silently.
 */
export const unmockSnapshot = (writer: ISnapshotWriterReader) => {
  return function(this: expect.MatcherState, obj: IListenerInput) {
    const snapshotInput = {
      testPath: this.testPath || "",
      currentTestName: this.currentTestName || "",
      data: obj,
    };
    debugLog(`Snapshotting: ${JSON.stringify(snapshotInput)}`);
    writer.write(snapshotInput);
    return MATCHER_PASS;
  };
};

expect.addSnapshotSerializer({
  print: (val: any) => JSON.stringify(val, undefined, 2),
  // Smoke test for a value that is a request-response pair
  test: (val: any) => val.req && val.req.method,
});
