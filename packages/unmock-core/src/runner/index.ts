import { seedHack } from "../generator";
export interface IRunnerOptions {
  maxLoop: number;
}

const defaultRunnerOptions: IRunnerOptions = {
  maxLoop: 20,
};

export default
  (fn?: jest.ProvidesCallback, options?: Partial<IRunnerOptions>) =>
  async (cb: jest.DoneCallback) => {
  const realOptions = {
    ...defaultRunnerOptions,
    ...options,
  };
  const errors = [];
  const res = [];
  for (let i = 0; i < realOptions.maxLoop; i++) {
    seedHack.seed = i;
    try {
      const r = await (fn ? fn(cb) : undefined);
      res.push(r);
    } catch (e) {
      if (e.constructor.name === "JestAssertionError") {
        errors.push(e);
      } else {
        throw e;
      }
    }
  }
  if (errors.length === realOptions.maxLoop) {
    errors[0].message = "@unmock - all tests in loop failed. Here is the first error.\n" + errors[0].message;
    throw errors[0];
  } else if (errors.length > 0) {
    errors[0].message = "@unmock - several tests in loop failed failed. Here is one error.\n" + errors[0].message;
    throw errors[0];
  }
  cb();
  return res;
};
