import expect from "expect";
import * as fs from "fs";
import * as mkdirp from "mkdirp";
import * as path from "path";

const SNAPSHOTS_FOLDER = path.join(process.cwd(), "__snapshots__");

const CLEARED_SNAPSHOT_FILES: string[] = [];

// Add snapshot handler
expect.addSnapshotSerializer({
  print: (val: any) => JSON.stringify(val, undefined, 2),
  // This serializer only applies to values that have these attributes:
  test: (val: any) => val && val.hash && val.host && val.method && val.path,
});

declare global {
  namespace expect {
    // tslint:disable-next-line: interface-name
    interface Matchers<R> {
      snapshot(obj: any): R;
    }
  }
}

expect.extend({
  snapshot(obj: any) {
    const snapFile = path.join(SNAPSHOTS_FOLDER, `${path.basename(this.testPath)}.snap`);
    if (!fs.existsSync(SNAPSHOTS_FOLDER)) {
      mkdirp.sync(SNAPSHOTS_FOLDER);
    }
    let contents: {[testCallNumber: string]: string} = {};
    if (fs.existsSync(snapFile)) {
      if (CLEARED_SNAPSHOT_FILES.indexOf(snapFile) === -1) {
        // First we delete previous snapshots, then we continuously update them.
        CLEARED_SNAPSHOT_FILES.push(snapFile);
        fs.unlinkSync(snapFile);
      } else {
        contents = require(snapFile);
      }
    }
    const numOfCalls = Object.keys(contents).length + 1;
    contents[`${this.currentTestName} ${numOfCalls}`] = obj;
    const stringContents = Object.keys(contents)
      .map((key: string) => "exports['" + key + "'] = " + JSON.stringify(contents[key], undefined, 2) + ";\n")
      .join("\n");
    fs.writeFileSync(snapFile, stringContents);
    return {pass: true};
  },
});

export const snapshot = (obj: any) => {
  if (process.env.JEST_WORKER_ID !== undefined) {
    // IDE might highlight `snapshot`, but it is well declared above, so we can ignore this...
    expect(obj).snapshot();  // Creates the snapshot with the above serializer
    // Reserved to add snapshots for other backends
  }
};
