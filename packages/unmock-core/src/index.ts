import { IBackend, IUnmockOptions } from "./interfaces";
import { UnmockOptions } from "./options";
import { doUsefulStuffWithRequestAndResponse } from "./util";
// top-level exports
export { UnmockOptions } from "./options";
export * from "./interfaces";
export * from "./generator";
export { stateStoreFactory, ServiceParser } from "./service";

export const util = {
  doUsefulStuffWithRequestAndResponse,
};

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
