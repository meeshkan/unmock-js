import Backend from "../backend";
import { runnerConfiguration } from "../generator";
export interface IRunnerOptions {
  maxLoop: number;
}

const defaultRunnerOptions: IRunnerOptions = {
  maxLoop: 20,
};

const errorHandler = (
  nTimes: number,
  errors: Error[],
  intermediaryErrors: Array<string | { message: string }>,
  cb?: jest.DoneCallback,
) => {
  // tslint:disable-next-line:max-line-length
  const msg = (rest: string) =>
    `This many tests failed: ${errors.length +
      intermediaryErrors.length} out of ${nTimes}. Here's the first error.\n${rest}`;
  if (errors.length) {
    errors[0].message = msg(errors[0].message);
  } else {
    intermediaryErrors[0] =
      typeof intermediaryErrors[0] === "string"
        ? msg(intermediaryErrors[0] as string)
        : {
            message: msg(
              (intermediaryErrors[0] as { message: string }).message,
            ),
          };
  }
  if (cb) {
    cb.fail(
      intermediaryErrors.length ? intermediaryErrors[0] : errors[0].message,
    );
  } else {
    throw errors[0];
  }
};

export default (backend: Backend) => (
  fn?: jest.ProvidesCallback,
  options?: Partial<IRunnerOptions>,
) => async (cb?: jest.DoneCallback) => {
  const realOptions = {
    ...defaultRunnerOptions,
    ...options,
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
    runnerConfiguration.seed = i;
    runnerConfiguration.optionalsProbability = Math.random();
    runnerConfiguration.minItems = Math.floor(Math.random() * 2 ** (i % 5)); // 2^5 seems enough for min items/length
    try {
      const r = await (fn ? fn(intermediaryDoneCallback) : undefined);
      res.push(r);
    } catch (e) {
      if (e.constructor.name === "JestAssertionError") {
        errors.push(e);
      } else {
        throw e;
      }
    } finally {
      // reset histories
      Object.entries(backend.serviceStore.services).forEach(([_, service]) => {
        service.spy.resetHistory();
      });
    }
  }
  runnerConfiguration.reset();
  // >= in case fail is called multiple times... fix
  if (errors.length + intermediaryErrors.length > 0) {
    errorHandler(realOptions.maxLoop, errors, intermediaryErrors, cb);
  } else {
    // tslint:disable-next-line:no-unused-expression
    cb && cb();
  }
};
