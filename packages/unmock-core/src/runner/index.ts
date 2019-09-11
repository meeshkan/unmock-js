import chalk from "chalk";
import unmock from "..";

const errorHandler = (
  allFailed: boolean,
  errors: Error[],
  intermediaryErrors: Array<(string | { message: string})>,
  cb?: jest.DoneCallback) => {
    // tslint:disable-next-line:max-line-length
    const msg = (rest: string) => `${chalk.red("@unmock")} - ${allFailed ? "all" : "some"} tests failed. Here's the first error.\n${rest}`;
    if (errors.length) {
      errors[0].message = msg(errors[0].message);
    } else {
      intermediaryErrors[0] = typeof intermediaryErrors[0] === "string"
        ? msg(intermediaryErrors[0] as string)
        : { message: msg((intermediaryErrors[0] as { message: string}).message) };
    }
    if (cb) {
      cb.fail(intermediaryErrors.length ? intermediaryErrors[0] : errors[0].message);
    } else {
      throw errors[0];
    }
};

export default (fn?: jest.ProvidesCallback) =>
  async (cb?: jest.DoneCallback) => {
  const maxLoop = unmock.runnerOptions && unmock.runnerOptions.maxLoop || 20;
  const intermediaryErrors: Array<(string | { message: string})> = [];
  const intermediaryDoneCallback: jest.DoneCallback = () => { /**/ };
  intermediaryDoneCallback.fail = (error: string | {message: string}) => { intermediaryErrors.push(error); };
  const errors: Error[] = [];
  const res = [];
  if (!unmock.runnerOptions) {
    unmock.runnerOptions = {};
  }
  for (let i = 0; i < maxLoop; i++) {
    unmock.runnerOptions.seed = i;
    unmock.on();
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
    unmock.off();
  }
  // >= in case fail is called multiple times... fix
  if (errors.length + intermediaryErrors.length >= maxLoop) {
    errorHandler(true, errors, intermediaryErrors, cb);
  } else if (errors.length + intermediaryErrors.length > 0) {
    errorHandler(false, errors, intermediaryErrors, cb);
  } else {
    // tslint:disable-next-line:no-unused-expression
    cb && cb();
  }
};
