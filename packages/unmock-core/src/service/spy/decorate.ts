import { decorators } from "./generated";
import { ServiceSpy, SinonSpy } from "./types";

/**
 * Add custom methods to spy
 * @param spy Sinon spy (NOTE: modified in-place!)
 */
export const decorateSpy = (spy: SinonSpy): ServiceSpy => {
  return Object.assign(spy, decorators);
};

export const verifyOnlyOneCall = ({
  spy,
  errPrefix
}: {
  spy: ServiceSpy;
  errPrefix: string;
}): ServiceSpy => {
  const callCount = spy.callCount;
  if (callCount !== 1) {
    throw Error(
      `${errPrefix}: Expected one matching call, got ${callCount} calls`
    );
  }
  return spy;
};

export default decorateSpy;
