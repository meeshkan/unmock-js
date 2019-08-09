import { Console } from "console";
import { format } from "util";
import { Colors } from "./colors";
import { LogMessage, LogType } from "./types";

type Format = (type: LogType, message: LogMessage) => string;

function clearLine(stream: NodeJS.WritableStream & { isTTY?: boolean }) {
  if (stream.isTTY) {
    stream.write("\x1b[999D\x1b[K");
  }
}

const formatLogType: Format = (type: LogType, message: LogMessage) => {
  if (type in Colors) {
    return Colors[type](message);
  }
  return message;
};

export class CustomConsole extends Console {
  private readonly stdout: NodeJS.WritableStream;
  private readonly stderr: NodeJS.WritableStream;
  private readonly indentations = 1;
  constructor(stdout: NodeJS.WritableStream, stderr: NodeJS.WritableStream) {
    super(stdout, stderr);
    this.stdout = stdout;
    this.stderr = stderr;
  }

  public instruct(firstArg: any, ...args: any[]) {
    this.logMessage("instruct", format(firstArg, ...args));
  }

  public error(firstArg: any, ...args: any[]) {
    this.logError("error", format(firstArg, ...args));
  }

  private logMessage(type: LogType, message: string) {
    clearLine(this.stdout);
    super.log(formatLogType(type, "  ".repeat(this.indentations) + message));
  }

  private logError(type: LogType, message: string) {
    clearLine(this.stderr);
    super.error(formatLogType(type, "  ".repeat(this.indentations) + message));
  }
}
