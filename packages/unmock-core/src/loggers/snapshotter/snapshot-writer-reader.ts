import debug from "debug";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { IListenerInput } from "../../interfaces";

const debugLog = debug("unmock:snapshot-writer");

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

export class FsSnapshotWriterReader implements ISnapshotWriterReader {
  private readonly outputFile: string;
  constructor(snapshotFolder: string) {
    this.outputFile = path.resolve(snapshotFolder, "snapshots.jsonl");
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

  public read(): ISnapshot[] {
    if (!fs.existsSync(this.outputFile)) {
      return [];
    }

    const fileContents = fs.readFileSync(this.outputFile, ENCODING);
    const lines = fileContents.split(os.EOL);
    return lines
      .filter(line => !!line.trim())
      .map(line => {
        debugLog(`Parsing line: ${line}`);
        return JSON.parse(line);
      });
  }

  public deleteSnapshots() {
    if (fs.existsSync(this.outputFile)) {
      fs.unlinkSync(this.outputFile);
    }
  }
}
