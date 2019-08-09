import chalk from "chalk";
import { Console } from "console";
import { format } from "util";
import { LogMessage, LogType } from "./types";

type Format = (type: LogType, message: LogMessage) => string;

function clearLine(stream: NodeJS.WritableStream & { isTTY?: boolean }) {
  if (stream.isTTY) {
    stream.write("\x1b[999D\x1b[K");
  }
}

const formatLogType: Format = (type: LogType, message: LogMessage) => {
  switch (type) {
    case "assert": {
      return chalk.bold.red(message);
    }
    case "debug": {
      return chalk.bold.yellow(message);
    }
    case "log": {
      return chalk.bold.magenta(message);
    }
    case "instruct": {
      return chalk.bold.magenta(message);
    }
    case "warn": {
      return chalk.bold.yellow(message);
    }
    case "error": {
      return chalk.bold.yellow(message);
    }
    case "info": {
      return chalk.bold.yellow(message);
    }
  }
};

export class CustomConsole extends Console {
  private readonly stdout: NodeJS.WritableStream;
  private readonly stderr: NodeJS.WritableStream;
  constructor(stdout: NodeJS.WritableStream, stderr: NodeJS.WritableStream) {
    super(stdout, stderr);
    this.stdout = stdout;
    this.stderr = stderr;
  }

  public log(firstArg: any, ...args: any[]) {
    this.logMessage("log", format(firstArg, ...args));
  }

  public instruct(firstArg: any, ...args: any[]) {
    this.logMessage("instruct", format(firstArg, ...args));
  }

  public warn(firstArg: any, ...args: any[]) {
    this.logMessage("warn", format(firstArg, ...args));
  }

  public error(firstArg: any, ...args: any[]) {
    this.logError("error", format(firstArg, ...args));
  }

  private logMessage(type: LogType, message: string) {
    clearLine(this.stdout);
    super.log(formatLogType(type, message));
  }

  private logError(type: LogType, message: string) {
    clearLine(this.stderr);
    super.error(formatLogType(type, message));
  }
}

const customConsole = new CustomConsole(process.stdout, process.stderr);

export default customConsole;
