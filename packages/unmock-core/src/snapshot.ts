import expect from "expect";
import * as fs from "fs";
import * as path from "path";

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
    const snapFile = path.join("__snapshots__", `${this.currentTestName}.snap`);
    let contents: {[testCallNumber: string]: string} = {};
    if (fs.existsSync(snapFile)) {
      contents = require(snapFile);
    }
    const numOfCalls = Object.keys(contents).length + 1;
    contents[`${this.currentTestName} ${numOfCalls}`] = JSON.stringify(obj, undefined, 2);
    fs.writeFileSync(snapFile, Object.keys(contents).map(
      (key: string) => "exports['" + key + "'] = " + contents[key] + ";"),
    );
  },
});

export const snapshot = (obj: any) => {
  if (process.env.JEST_WORKER_ID !== undefined) {
    expect(obj).snapshot(); // Creates the snapshot with the above serializer
    // Reserved to add snapshots for other backends
  }
};
