import { Service } from "../service/service";
import { RequestResponseSpy } from "../service/spy";

/**
 * expect-extend format for custom expects.
 * Can be passed to jest with `expect.extend(ExpectExtend)`
 */
export const UnmockExpectExtend = {
  called(receivedService: Service) {
    const spy: RequestResponseSpy = receivedService.spy;

    if (spy.called) {
      return {
        message: () => `expected not to be called`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected to be called`,
        pass: false,
      };
    }
  },
  calledTimes(receivedService: Service, count: number) {
    const spy: RequestResponseSpy = receivedService.spy;

    if (spy.callCount === count) {
      return {
        message: () => `expected not to be called ${count} times`,
        pass: true,
      };
    } else {
      return {
        message: () =>
          `expected to be called ${count} times, was called ${spy.callCount} times`,
        pass: false,
      };
    }
  },
};

export type UnmockExpectExtend = typeof UnmockExpectExtend;
