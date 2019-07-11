import { filterTopLevelDSL, getTopLevelDSL } from "../dsl";
import {
  IStateInputGenerator,
  Schema,
  UnmockServiceState,
} from "../interfaces";
import { spreadStateFromService } from "./validator";

export default (state?: UnmockServiceState): IStateInputGenerator => ({
  isEmpty: state === undefined || Object.keys(state).length === 0,
  top: getTopLevelDSL(state || {}),
  gen: (schema: Schema) =>
    spreadStateFromService(schema, filterTopLevelDSL(state || {})),
});
