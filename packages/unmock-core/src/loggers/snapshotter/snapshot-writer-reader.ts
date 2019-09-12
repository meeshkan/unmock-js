import debug from "debug";
import * as fs from "fs";
import { flatten } from "lodash";
import * as os from "os";
import * as path from "path";
import { IListenerInput } from "../../interfaces";

const debugLog = debug("unmock:snapshotter:writer");

export interface ISnapshot {
  testPath: string;
  currentTestName: string;
  data: IListenerInput;
}

export interface ISnapshotWriterReader {
  write(snapshot: ISnapshot): void;
  read(): ISnapshot[];
  deleteSnapshots(): void;
}

const format = (snapshot: ISnapshot): string => {
  return JSON.stringify(snapshot);
};

const ENCODING = "utf-8";
const SNAPSHOT_FILENAME = "snapshots.jsonl";

const createTmpDir = (snapshotFolder: string): string => {
  return fs.mkdtempSync(`${snapshotFolder}${path.sep}`);
};

export class FsSnapshotWriterReader implements ISnapshotWriterReader {
  public static readFileContents(filename: string): ISnapshot[] {
    const fileContents = fs.readFileSync(filename, ENCODING);
    const lines = fileContents.split(os.EOL);
    return lines
      .filter(line => !!line.trim())
      .map(line => {
        debugLog(`Parsing line: ${line}`);
        return JSON.parse(line);
      });
  }
  private readonly outputFile: string;
  constructor(private readonly snapshotFolder: string) {
    this.outputFile = path.join(
      createTmpDir(snapshotFolder),
      SNAPSHOT_FILENAME,
    );
  }

  public write(snapshot: ISnapshot) {
    const contents = format(snapshot);
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
    return flatten(snapshots);
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
