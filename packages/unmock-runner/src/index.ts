import { UnmockPackage } from "unmock-core";
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

export interface IMeeshkanDoneCallback {
  success(...args: any[]): any;
  fail(error?: string | { message: string }): any;
}

export type MeeshkanProvidesCallback = (cb: IMeeshkanDoneCallback) => any;

export default (assertionValidator: (e: Error) => boolean) => (
  unmockPackage: UnmockPackage,
) => (
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
    unmockPackage.backend.faker.randomNumberGenerator.setSeed(i);
    unmockPackage.backend.faker.optionalsProbability = Math.random();
    unmockPackage.backend.faker.minItems = Math.floor(
      Math.random() * 2 ** (i % 5),
    ); // 2^5 seems enough for min items/length

    try {
      const r = await (fn ? fn(intermediaryDoneCallback) : undefined);
      res.push(r);
    } catch (e) {
      if (assertionValidator(e)) {
        errors.push(e);
      } else {
        throw e;
      }
    } finally {
      // reset histories
      Object.entries(unmockPackage.backend.serviceStore.services).forEach(
        ([_, service]) => {
          service.spy.resetHistory();
        },
      );
    }
    // this resets the values going into the faker
    unmockPackage.backend.faker.optionalsProbability = 1.0;
    unmockPackage.backend.faker.minItems = 0;
  }
  // >= in case fail is called multiple times... fix
  if (errors.length + intermediaryErrors.length > 0) {
    errorHandler(realOptions.maxLoop, errors, intermediaryErrors, cb);
  } else {
    // tslint:disable-next-line:no-unused-expression
    cb && cb.success();
  }
};
