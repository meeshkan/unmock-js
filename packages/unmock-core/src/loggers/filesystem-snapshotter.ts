import { realpathSync } from "fs";
import { merge } from "lodash";
import { tmpdir as osTmpdir } from "os";
import { resolve as pathResolve } from "path";

import {
  IListener,
  ISerializedRequest,
  ISerializedResponse,
} from "../interfaces";

export interface IFSSnapshotterOptions {
  outputFile: string;
}

export const DEFAULT_SNAPSHOT_FILE = realpathSync(
  pathResolve(osTmpdir(), "unmock.snap"),
);

const DEFAULT_OPTIONS: IFSSnapshotterOptions = {
  outputFile: DEFAULT_SNAPSHOT_FILE,
};

export const resolveOptions = (
  userOptions: Partial<IFSSnapshotterOptions>,
): IFSSnapshotterOptions => {
  return merge({}, DEFAULT_OPTIONS, userOptions);
};

export default class FSSnapshotter implements IListener {
  private readonly options: IFSSnapshotterOptions;
  constructor(userOptions?: Partial<IFSSnapshotterOptions>) {
    this.options = resolveOptions(userOptions || {});
  }

  public notify({
    req,
    res,
  }: {
    req: ISerializedRequest;
    res?: ISerializedResponse;
  }) {
    // Do something with req, res
    console.log("TODO!", req, res, this.options); // tslint:disable-line
    return;
  }
}
