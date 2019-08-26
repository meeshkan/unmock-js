import { Service } from "../service/service";
import { RequestResponseSpy } from "../service/spy";

/**
 * expect-extend format for custom expects.
 * Can be passed to jest with `expect.extend(ExpectExtend)`
 */
export const UnmockExpectExtend = {
  called(receivedService: Service) {
    if (!("spy" in receivedService)) {
      throw Error("Expected to receive a service with spy member");
    }

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
    if (!("spy" in receivedService)) {
      throw Error("Expected to receive a service with spy member");
    }

    const spy: RequestResponseSpy = receivedService.spy;

    if (spy.callCount === count) {
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
};

export type UnmockExpectExtend = typeof UnmockExpectExtend;
