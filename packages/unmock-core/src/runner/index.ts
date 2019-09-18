import chalk from "chalk";
import { seedHack } from "../generator";
export interface IRunnerOptions {
  maxLoop: number;
}

const defaultRunnerOptions: IRunnerOptions = {
  maxLoop: 20
};

const errorHandler = (
  allFailed: boolean,
  errors: Error[],
  intermediaryErrors: Array<string | { message: string }>,
  cb?: jest.DoneCallback
) => {
  const msg = (rest: string) =>
    `${chalk.red("@unmock")} - ${
      allFailed ? "all" : "some"
    } tests failed. Here's the first error.\n${rest}`;
  if (errors.length) {
    errors[0].message = msg(errors[0].message);
  } else {
    intermediaryErrors[0] =
      typeof intermediaryErrors[0] === "string"
        ? msg(intermediaryErrors[0] as string)
        : {
            message: msg((intermediaryErrors[0] as { message: string }).message)
          };
  }
  if (cb) {
    cb.fail(
      intermediaryErrors.length ? intermediaryErrors[0] : errors[0].message
    );
  } else {
    throw errors[0];
  }
};

export default (
  fn?: jest.ProvidesCallback,
  options?: Partial<IRunnerOptions>
) => async (cb?: jest.DoneCallback) => {
  const realOptions = {
    ...defaultRunnerOptions,
    ...options
  };
  const intermediaryErrors: Array<string | { message: string }> = [];
  const intermediaryDoneCallback: jest.DoneCallback = () => {
    /**/
  };
  intermediaryDoneCallback.fail = (error: string | { message: string }) => {
    intermediaryErrors.push(error);
  };
  const errors: Error[] = [];
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
    errorHandler(true, errors, intermediaryErrors, cb);
  } else if (errors.length + intermediaryErrors.length > 0) {
    errorHandler(false, errors, intermediaryErrors, cb);
  } else {
    cb && cb();
  }
};
