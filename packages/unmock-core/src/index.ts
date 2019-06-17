import { IBackend, IUnmockOptions } from "./interfaces";
import { UnmockOptions } from "./options";
// top-level exports
export { UnmockOptions } from "./options";
export * from "./interfaces";
export * from "./matcher";
export * from "./request-handler";

export const unmock = (baseOptions: UnmockOptions, backend: IBackend) => async (
  maybeOptions?: IUnmockOptions,
): Promise<UnmockOptions> => {
  const options = baseOptions.reset(maybeOptions);
  if (process.env.NODE_ENV !== "production" || options.useInProduction) {
    backend.initialize(options);
  }
  return options;
};

export const kcomnu = () => {
  // do something here
};
