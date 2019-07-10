import {
  IStateInputGenerator,
  Schema,
  UnmockServiceState,
} from "../interfaces";
import { TopLevelDSLKeys } from "../interfaces";
import { spreadStateFromService } from "./validator";

const getTopLevelDSL = (state: UnmockServiceState) => {
  return Object.keys(state)
    .filter(
      (key: string) =>
        TopLevelDSLKeys[key] !== undefined &&
        TopLevelDSLKeys[key] === typeof state[key],
    )
    .reduce((a, b) => ({ ...a, [b]: state[b] }), {});
};

const filterTopLevelDSL = (state: UnmockServiceState) => {
  return Object.keys(state)
    .filter(
      (key: string) =>
        TopLevelDSLKeys[key] === undefined ||
        TopLevelDSLKeys[key] !== typeof state[key],
    )
    .reduce((a, b) => ({ ...a, [b]: state[b] }), {});
};

export default (state?: UnmockServiceState): IStateInputGenerator => ({
  isEmpty: state === undefined || Object.keys(state).length === 0,
  top: getTopLevelDSL(state || {}),
  gen: (schema: Schema) =>
    spreadStateFromService(schema, filterTopLevelDSL(state || {})),
});
