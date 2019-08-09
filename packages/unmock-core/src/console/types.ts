export type LogMessage = string;

export interface ILogEntry {
  message: LogMessage;
  type: LogType;
}

export type LogType = "error" | "instruct";
