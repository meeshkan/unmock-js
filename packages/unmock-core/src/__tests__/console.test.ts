import { Writable } from "stream";
import unmockConsole, { CustomConsole } from "../console";

class ArrayWritable extends Writable {
  public readonly written: string[] = [];
  constructor(options?: any) {
    super(options);
  }

  public _write(chunk: any, _: string, callback: any) {
    this.written.push(chunk.toString());
    return callback();
  }
}

const getConsole = () => {
  const stdout = new ArrayWritable();
  const stderr = new ArrayWritable();
  const customConsole = new CustomConsole(stdout, stderr);
  return { stdout, stderr, customConsole };
};

describe("Custom console", () => {
  const logMessage = "Log message";
  it("writes instructions with formatting", () => {
    const { stdout, customConsole } = getConsole();

    customConsole.instruct(logMessage);

    expect(stdout.written.length).toBe(1);
    expect(stdout.written[0]).toContain(logMessage);
    expect(stdout.written[0]).not.toEqual(logMessage); // Some formatting was done
    expect(stdout.written[0]).toContain("  "); // Added indentation
  });

  // For testing console output
  it("writes instructions to real console", () => {
    unmockConsole.instruct(logMessage);
  });

  it("writes regular logs without formatting", () => {
    const { stdout, customConsole } = getConsole();

    customConsole.log("Log message");

    expect(stdout.written.length).toBe(1);
    expect(stdout.written[0]).toMatch(new RegExp(`^${logMessage}`));
  });
});
