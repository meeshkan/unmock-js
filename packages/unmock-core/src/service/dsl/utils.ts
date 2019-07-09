import { UnmockServiceState } from "../interfaces";
import { TopLevelDSLKeys } from "./interfaces";

export const getTopLevelDSL = (state: UnmockServiceState) => {
  return Object.keys(state)
    .filter(
      (key: string) =>
        TopLevelDSLKeys[key] !== undefined &&
        TopLevelDSLKeys[key] === typeof state[key],
    )
    .reduce((a, b) => ({ ...a, [b]: state[b] }), {});
};

export const filterTopLevelDSL = (state: UnmockServiceState) => {
  return Object.keys(state)
    .filter(
      (key: string) =>
        TopLevelDSLKeys[key] === undefined ||
        TopLevelDSLKeys[key] !== typeof state[key],
    )
    .reduce((a, b) => ({ ...a, [b]: state[b] }), {});
};
