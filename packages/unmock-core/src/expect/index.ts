import { Service } from "../service/service";
import { RequestResponseSpy } from "../service/spy";

interface IExpectReturn {
  message: () => string;
  pass: boolean;
}

function bindFirstArg(
  service: Service,
  fn: (s: Service) => IExpectReturn,
): () => IExpectReturn;

function bindFirstArg<B>(
  service: Service,
  fn: (s: Service, b: B) => IExpectReturn,
): (b: B) => IExpectReturn;

function bindFirstArg<B, C>(
  service: Service,
  fn: (s: Service, b: B, c: C) => IExpectReturn,
): (b: B, c: C) => IExpectReturn;

function bindFirstArg(
  service: Service,
  f: (s: Service, ...b: any[]) => IExpectReturn,
): Expect<typeof f> {
  return (...b) => f(service, ...b);
}

// T extends (...args: any) => any> = T extends (...args: any) => infer R ? R : any;
// type A = Pick<{ name: string }, "name">;
// type Parameters<T extends (...args: any) => any> = T extends (...args: infer P) => any ? P : never;

/**
 * Type for the return type when service is bound.
 * For example: toBeCalled -> () => IExpectReturn
 * For example: toBeCalledTimes -> (n: number) => IExpectReturn
 */
type Expect<T extends (a: any, ...args: any) => any> = T extends (
  a: any,
) => infer B
  ? () => B
  : T extends (a: any, ...b: infer P) => infer B
  ? (...p: P) => B
  : never;

// type Fn = Expect<typeof expectExtend.toBeCalled>;
// type Fn2 = Expect<typeof expectExtend.toBeCalledTimes>;
// type Fn3 = Expect<typeof fn3>;

/**
 * `unmock.expect`, independent of jest.
 * unmock.expect(service).toBeCalled();
 * unmock.expect(service).toBeCalledTimes(1);
 * @param service Service instance
 */
export const expect = (service: Service) => {
  const called = bindFirstArg(service, expectExtend.called);
  const calledTimes = bindFirstArg(service, expectExtend.calledTimes);
  return {
    called,
    calledTimes,
  };
};

/**
 * expect-extend format for custom expects.
 */
const expectExtend = {
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
