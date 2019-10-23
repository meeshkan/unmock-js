import { flow } from "lodash/fp";
import { Chalks } from "./chalks";
import { LogMessage, LogType } from "./types";

type Format = (type: LogType, message: LogMessage) => string;

const formatLogType: Format = (type: LogType, message: LogMessage): string =>
  flow(
    (m: string) => "unmock: " + m,
    (m: string) => Chalks[type](m),
  )(message);

export const formatMsg = (type: LogType, message: string): string => {
  return formatLogType(type, message);
};
