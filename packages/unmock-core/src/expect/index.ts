import { Service } from "../service/service";
import { UnmockExpectExtend } from "./extend";

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
 * `unmock.expect`, independent of jest. Makes callable expects from `UnmockExpectExtend` as follows:
 * unmock.expect(service).toBeCalled(); => UnmockExpectExtend.toBeCalled(service);
 * unmock.expect(service).toBeCalledTimes(1) => UnmockExpectExtend.toBeCalledTimes(service, 1);
 * @param service Service instance
 */
export const expect = (service: Service): UnmockExpectType => {
  return {
    called: bindFirstArg(service, UnmockExpectExtend.called),
    calledTimes: bindFirstArg(service, UnmockExpectExtend.calledTimes),
  };
};

type UnmockExpectType = {
  [P in keyof UnmockExpectExtend]: Expect<UnmockExpectExtend[P]>;
};
