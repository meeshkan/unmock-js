import { IBackend, IUnmockOptions } from "./interfaces";
import { UnmockOptions } from "./options";
import * as mw from "./service/state/middleware";
// top-level exports
export { UnmockOptions } from "./options";
export * from "./interfaces";
export * from "./generator";

export const unmock = (baseOptions: UnmockOptions, backend: IBackend) => (
  maybeOptions?: IUnmockOptions,
): any => {
  const options = baseOptions.reset(maybeOptions);
  if (process.env.NODE_ENV !== "production" || options.useInProduction) {
    return backend.initialize(options);
  }
  return () => {
    throw new Error("Are you trying to run unmock in production?");
  };
};
export const middleware = mw;
