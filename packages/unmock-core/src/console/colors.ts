import chalk, { Chalk, ColorSupport } from "chalk";
import { LogType } from "./types";

const error = chalk.bold.red;
const instruct = chalk.bold.magenta;

export const Colors: {
  [key in LogType]: Chalk & { supportsColor: ColorSupport }
} = {
  error,
  instruct,
};
