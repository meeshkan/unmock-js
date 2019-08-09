import { Writable } from "stream";
import unmockConsole, { CustomConsole } from "../console";

class ArrayWritable extends Writable {
  public readonly written: string[] = [];
  constructor(options?: any) {
    super(options);
  }

  protected _write(chunk: any, _: string, callback: any) {
    this.written.push(chunk.toString());
    return callback();
  }
}

describe("Custom console", () => {
  it("writes to given log stream", () => {
    const logStream = new ArrayWritable();
    const errorStream = new ArrayWritable();
    const customConsole = new CustomConsole(logStream, errorStream);

    customConsole.instruct("Log message");
    expect(logStream.written.length).toBe(1);
    expect(logStream.written[0]).toContain("Log message");
  });

  it("writes to given log stream", () => {
    const logStream = new ArrayWritable();
    const errorStream = new ArrayWritable();
    const customConsole = new CustomConsole(logStream, errorStream);

    customConsole.log("Log message");
    expect(logStream.written.length).toBe(1);
    expect(logStream.written[0]).toBe("Log message");
  });
});
