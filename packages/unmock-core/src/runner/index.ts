import { seedHack } from "../generator";
import Logger from "../loggers/winston-logger";
export interface IRunnerOptions {
  maxLoop: number;
}

const logger = new Logger();

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
    logger.log("Too many errors for unmock to handle, only showing the first one.");
    throw errors[0];
  } else if (errors.length > 0) {
    logger.log("Unmock got several errors. Check the output from the runner. We'll show you one for kicks now.");
    throw errors[0];
  }
  cb();
  return res;
};
