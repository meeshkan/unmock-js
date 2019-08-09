import boxen, { Options as BoxenOptions } from "boxen";
import { Console } from "console";
import { flow } from "lodash/fp";
import { format } from "util";
import { Chalks } from "./chalks";
import { LogMessage, LogType } from "./types";

type Format = (type: LogType, message: LogMessage) => string;

const indentRegex = /^(?!\s*$)/gm;
const indentString = (s: string, count: number) =>
  s.replace(indentRegex, " ".repeat(count));

function clearLine(stream: NodeJS.WritableStream & { isTTY?: boolean }) {
  if (stream.isTTY) {
    stream.write("\x1b[999D\x1b[K");
  }
}

const boxenOptions: BoxenOptions = {
  padding: 0,
  borderStyle: {
    topLeft: "-",
    topRight: "-",
    bottomLeft: "-",
    bottomRight: "-",
    horizontal: "-",
    vertical: " ",
  },
};

const formatLogType: Format = (type: LogType, message: LogMessage): string =>
  flow(
    (m: string) => "unmock: " + m,
    (m: string) => (type === "instruct" ? boxen(m, boxenOptions) : message),
    (m: string) => Chalks[type](m),
  )(message);

export class CustomConsole extends Console {
  private readonly stdout: NodeJS.WritableStream;
  private readonly stderr: NodeJS.WritableStream;
  private readonly nIndent = 2;
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
    super.log(indentString(formatLogType(type, message), this.nIndent));
  }

  private logError(type: LogType, message: string) {
    clearLine(this.stderr);
    super.error(indentString(formatLogType(type, message), this.nIndent));
  }
}
