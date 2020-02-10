import runner, { IMeeshkanDoneCallback, IRunnerOptions } from "../";
import unmock from "../../unmock/src/node";

// Jest runner used for existing runner tests
// This will be replaced once unmock-jest-runner package is published
export const jestRunner = (
  fn?: jest.ProvidesCallback,
  options?: Partial<IRunnerOptions>,
) => async (cb?: jest.DoneCallback) => {
  return runner((e: Error) => e.constructor.name === "JestAssertionError")(
    unmock,
  )((meeshkanCallback: IMeeshkanDoneCallback) => {
    const asJestCallback = () => {
      meeshkanCallback.success();
    };
    asJestCallback.fail = meeshkanCallback.fail;
    return fn ? fn(asJestCallback) : undefined;
  }, options)(cb ? { success: cb, fail: cb.fail } : undefined);
};

export default jestRunner;
