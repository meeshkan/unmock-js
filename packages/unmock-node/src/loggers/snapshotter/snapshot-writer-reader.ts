import debug from "debug";
import * as fs from "fs";
import { flatten, sortBy } from "lodash";
import * as os from "os";
import * as path from "path";
import { IListenerInput } from "unmock-core";

const debugLog = debug("unmock:snapshotter:writer");

export interface ISnapshot {
  timestamp: Date;
  testPath: string;
  currentTestName: string;
  data: IListenerInput;
}

export interface ISnapshotWriterReader {
  write(snapshot: ISnapshot): void;
  read(): ISnapshot[];
  deleteSnapshots(): void;
}

export const format = (snapshot: ISnapshot): string => {
  const withStringTs = {
    ...snapshot,
    timestamp: snapshot.timestamp.toISOString(),
  };
  return JSON.stringify(withStringTs);
};

const ENCODING = "utf-8";
const SNAPSHOT_FILENAME = "snapshots.jsonl";

const createTmpDirIn = (snapshotFolder: string): string => {
  return fs.mkdtempSync(`${snapshotFolder}${path.sep}`);
};

export const parseSnapshot = (str: string): ISnapshot => {
  const parsed = JSON.parse(str);
  return { ...parsed, timestamp: new Date(parsed.timestamp) };
};

export class FsSnapshotWriterReader implements ISnapshotWriterReader {
  public static readFileContents(filename: string): ISnapshot[] {
    const fileContents = fs.readFileSync(filename, ENCODING);
    const lines = fileContents.split(os.EOL);
    return lines.filter(line => !!line.trim()).map(line => parseSnapshot(line));
  }
  /* Internally used folder for writes, example: `${snapshotFolder}/RANDOM_STRING` */
  private readonly outputFolder: string;
  /* Destination for writes, example: `${snapshotFolder}/RANDOM_STRING/snapshots.jsonl` */
  private readonly outputFile: string;
  /**
   * Write snapshots to a given folder. Snapshots are internally written to folders nested inside
   * the given folder.
   * @param snapshotFolder Folder where snapshots are stored (possibly inside nested directories)
   */
  constructor(private readonly snapshotFolder: string) {
    this.outputFolder = createTmpDirIn(snapshotFolder);
    this.outputFile = path.join(this.outputFolder, SNAPSHOT_FILENAME);
  }

  public write(snapshot: ISnapshot) {
    const contents = format(snapshot);
    // Check if the output folder exists, it may have been deleted by `deleteSnapshots`
    if (!fs.existsSync(this.outputFolder)) {
      fs.mkdirSync(this.outputFolder);
    }
    if (!fs.existsSync(this.outputFile)) {
      debugLog(`Writing to new file ${this.outputFile}`);
      fs.writeFileSync(this.outputFile, contents + os.EOL, {
        encoding: ENCODING,
      });
    } else {
      debugLog(`Appending to file ${this.outputFile}`);
      fs.appendFileSync(this.outputFile, contents + os.EOL, {
        encoding: ENCODING,
      });
    }
  }

  public findSnapshotFiles(): string[] {
    return fs
      .readdirSync(this.snapshotFolder)
      .map(filename => path.join(this.snapshotFolder, filename))
      .filter(file => fs.lstatSync(file).isDirectory())
      .map(dir => path.join(dir, SNAPSHOT_FILENAME))
      .filter(
        filename => fs.existsSync(filename) && fs.lstatSync(filename).isFile(),
      );
  }

  public read(): ISnapshot[] {
    if (!fs.existsSync(this.snapshotFolder)) {
      return [];
    }

    const snapshotFiles = this.findSnapshotFiles();
    const snapshots: ISnapshot[][] = snapshotFiles.map(filename =>
      FsSnapshotWriterReader.readFileContents(filename),
    );
    return sortBy(flatten(snapshots), (snapshot: ISnapshot) =>
      snapshot.timestamp.getTime(),
    );
  }

  public deleteSnapshots(): void {
    if (!fs.existsSync(this.snapshotFolder)) {
      return;
    }
    this.findSnapshotFiles().forEach(filename => {
      fs.unlinkSync(filename);
      // If directory empty, delete
      const directory = path.dirname(filename);
      if (fs.readdirSync(directory).length === 0) {
        debugLog(`Deleting directory: ${directory}`);
        fs.rmdirSync(directory);
      } else {
        debugLog(`Directory not empty, not removing: ${directory}`);
      }
    });
  }
}
