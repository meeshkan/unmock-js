import { Done, Func } from "mocha";
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
  cb?: IMeeshkanDoneCallback,
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

interface IMeeshkanDoneCallback {
  success(...args: any[]): any;
  fail(error?: string | { message: string }): any;
}

type MeeshkanProvidesCallback = (cb: IMeeshkanDoneCallback) => any;

const runnerInternal = (isJest: boolean) => (backend: Backend) => (
  fn?: MeeshkanProvidesCallback,
  options?: Partial<IRunnerOptions>,
) => async (cb?: IMeeshkanDoneCallback) => {
  const realOptions = {
    ...defaultRunnerOptions,
    ...options,
  };
  const intermediaryErrors: Array<string | { message: string }> = [];
  const intermediaryDoneCallback: IMeeshkanDoneCallback = {
    success: () => {
      /**/
    },
    fail: () => {},
  };
  intermediaryDoneCallback.fail = (error: string | { message: string }) => {
    intermediaryErrors.push(error);
  };
  const errors: Error[] = [];
  const res = [];
  for (let i = 0; i < realOptions.maxLoop; i++) {
    backend.randomNumberGenerator.setSeed(i);
    runnerConfiguration.optionalsProbability = Math.random();
    runnerConfiguration.minItems = Math.floor(Math.random() * 2 ** (i % 5)); // 2^5 seems enough for min items/length
    try {
      const r = await (fn ? fn(intermediaryDoneCallback) : undefined);
      res.push(r);
    } catch (e) {
      if (!isJest || e.constructor.name === "JestAssertionError") {
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
    cb && cb.success();
  }
};

export const mochaRunner = (backend: Backend) => (
  fn: Func,
  options?: Partial<IRunnerOptions>,
) => async (cb?: Done) => {
  return runnerInternal(true)(backend)(
    (meeshkanCallback: IMeeshkanDoneCallback) => {
      // check fn.caller to make sure it actually does what it is
      // supposed to do, namely get the calling instance
      // we use success, but we could have used fail as well
      // because it points to the same function
      return fn ? fn.caller(meeshkanCallback.success) : undefined;
    },
    options,
  )(cb ? { success: cb, fail: cb } : undefined);
};

export const jestRunner = (backend: Backend) => (
  fn?: jest.ProvidesCallback,
  options?: Partial<IRunnerOptions>,
) => async (cb?: jest.DoneCallback) => {
  return runnerInternal(true)(backend)(
    (meeshkanCallback: IMeeshkanDoneCallback) => {
      const asJestCallback = () => {
        meeshkanCallback.success();
      };
      asJestCallback.fail = meeshkanCallback.fail;
      return fn ? fn(asJestCallback) : undefined;
    },
    options,
  )(cb ? { success: cb, fail: cb.fail } : undefined);
};

export default jestRunner;
