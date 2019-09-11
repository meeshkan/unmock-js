import chalk from "chalk";
import { seedHack } from "../generator";
export interface IRunnerOptions {
  maxLoop: number;
}

const defaultRunnerOptions: IRunnerOptions = {
  maxLoop: 20,
};

export default
  (fn?: jest.ProvidesCallback, options?: Partial<IRunnerOptions>) =>
  async (cb?: jest.DoneCallback) => {
  const realOptions = {
    ...defaultRunnerOptions,
    ...options,
  };
  const intermediaryErrors: Array<(string | { message: string})> = [];
  const intermediaryDoneCallback: jest.DoneCallback = () => { /**/ };
  intermediaryDoneCallback.fail = (error: string | {message: string}) => { intermediaryErrors.push(error); };
  const errors = [];
  const res = [];
  for (let i = 0; i < realOptions.maxLoop; i++) {
    seedHack.seed = i;
    try {
      const r = await (fn ? fn(intermediaryDoneCallback) : undefined);
      res.push(r);
    } catch (e) {
      if (e.constructor.name === "JestAssertionError") {
        errors.push(e);
      } else {
        throw e;
      }
    }
  }
  // >= in case fail is called multiple times... fix
  if (errors.length + intermediaryErrors.length >= realOptions.maxLoop) {
    errors[0].message = `${chalk.red("@unmock")} - all tests failed. Here's the first error.\n` + errors[0].message;
    // tslint:disable-next-line:no-unused-expression
    cb && cb.fail(intermediaryErrors.length ? intermediaryErrors[0] : errors[0].message);
    // if there is no callback, we throw the error
    throw errors[0];
  } else if (errors.length + intermediaryErrors.length > 0) {
    errors[0].message = `${chalk.red("@unmock")} - several tests failed. Here's the first error.\n` + errors[0].message;
    // tslint:disable-next-line:no-unused-expression
    cb && cb.fail(intermediaryErrors.length ? intermediaryErrors[0] : errors[0].message);
    // if there is no callback, we call the error
    throw errors[0];
  } else {
    // tslint:disable-next-line:no-unused-expression
    cb && cb();
  }
};
