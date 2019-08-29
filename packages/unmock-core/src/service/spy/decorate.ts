import { decorators } from "./generated";
import { SinonSpy, UnmockServiceSpy } from "./types";

/**
 * Add custom methods to spy
 * @param spy Sinon spy (NOTE: modified in-place!)
 */
export const decorateSpy = (spy: SinonSpy): UnmockServiceSpy => {
  return Object.assign(spy, decorators);
};

export const verifyOnlyOneCall = ({
  spy,
  errPrefix,
}: {
  spy: UnmockServiceSpy;
  errPrefix: string;
}): UnmockServiceSpy => {
  const callCount = spy.callCount;
  if (callCount !== 1) {
    throw Error(
      `${errPrefix}: Expected one matching call, got ${callCount} calls`,
    );
  }
  return spy;
};

export default decorateSpy;
