import boxen, { Options as BoxenOptions } from "boxen";
import { flow } from "lodash/fp";
import { Chalks } from "./chalks";
import { LogMessage, LogType } from "./types";

type Format = (type: LogType, message: LogMessage) => string;

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

export const formatMsg = (type: LogType, message: string): string => {
  return formatLogType(type, message);
};
