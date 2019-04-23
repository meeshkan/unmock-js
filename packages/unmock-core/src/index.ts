import FailingBackend from "./backend/failing-backend";
import FailingLogger from "./logger/failing-logger";
import { IUnmockInternalOptions, IUnmockOptions } from "./options";
import FailingPersistence from "./persistence/failing-persistence";
import getToken from "./token";
import {
  buildPath,
  endReporter,
  hostIsWhitelisted,
  UNMOCK_UA_HEADER_NAME,
} from "./util";

// top-level exports
export { IUnmockInternalOptions, IUnmockOptions } from "./options";
export { IBackend } from "./backend";
export { ILogger } from "./logger";
export { IPersistence } from "./persistence";
export { IPersistableData } from "./util";
export const util = {
  UNMOCK_UA_HEADER_NAME,
  buildPath,
  endReporter,
  hostIsWhitelisted,
};
export { snapshot } from "./snapshot";

export const defaultOptions: IUnmockInternalOptions = {
  backend: new FailingBackend(),
  ignore: { headers: "\\w*User-Agent\\w*" },
  logger: new FailingLogger(),
  persistence: new FailingPersistence(),
  save: false,
  unmockHost: "api.unmock.io",
  unmockPort: "443",
  useInProduction: false,
  whitelist: ["127.0.0.1", "127.0.0.0", "localhost"],
};

const baseIgnore = (ignore: any) => (baseOptions: IUnmockInternalOptions) => (
  maybeOptions?: IUnmockOptions,
): IUnmockOptions => {
  const options = maybeOptions || baseOptions;
  return {
    ...options,
    ignore: options.ignore
      ? options.ignore instanceof Array
        ? options.ignore.concat(ignore)
        : [options.ignore, ignore]
      : [baseOptions.ignore, ignore],
  };
};

export const ignoreStory = baseIgnore("story");
export const ignoreAuth = baseIgnore({ headers: "Authorization" });

export const unmock = (baseOptions: IUnmockInternalOptions) => async (
  maybeOptions?: IUnmockOptions,
) => {
  const options = maybeOptions
    ? { ...baseOptions, ...maybeOptions }
    : baseOptions;
  if (process.env.NODE_ENV !== "production" || options.useInProduction) {
    const story = {
      story: [],
    };
    if (options.token) {
      options.persistence.saveToken(options.token);
    }
    const token = await getToken(options);
    options.backend.initialize(story, token, options);
  }
};

export const kcomnu = (baseOptions: IUnmockInternalOptions) => (
  maybeOptions?: IUnmockOptions,
) => {
  const options = maybeOptions
    ? { ...baseOptions, ...maybeOptions }
    : baseOptions;
  options.backend.reset();
};
