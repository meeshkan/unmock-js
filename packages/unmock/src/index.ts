import getToken from "./token";
import { IUnmockInternalOptions, IUnmockOptions } from "./unmock-options";
import FailingLogger from "./logger/failing-logger";
import FailingPersistence from "./persistence/failing-persistence";
import FailingBackend from "./backend/failing-backend";

export const defaultOptions: IUnmockInternalOptions = {
  backend: new FailingBackend(),
  ignore: {headers: "\\w*User-Agent\\w*"},
  logger: new FailingLogger(),
  persistence: new FailingPersistence(),
  save: false,
  unmockHost: "api.unmock.io",
  unmockPort: "443",
  useInProduction: false,
  whitelist: ["127.0.0.1", "127.0.0.0", "localhost"],
};

const baseIgnore = (ignore: any) => (fakeOptions?: IUnmockOptions): IUnmockOptions => {
  const options = fakeOptions || defaultOptions;
  return {
    ...options,
    ignore: options.ignore ?
      (options.ignore instanceof Array ?
        options.ignore.concat(ignore) :
        [options.ignore, ignore]) :
      [defaultOptions.ignore, ignore],
  };
};

export const ignoreStory = baseIgnore("story");
export const ignoreAuth = baseIgnore({headers: "Authorization" });

export const unmock = async (fakeOptions?: IUnmockOptions) => {
  const options = fakeOptions ? { ...defaultOptions, ...fakeOptions } : defaultOptions;
  if (process.env.NODE_ENV !== "production" || options.useInProduction) {
    const story = {
      story: [],
    };
    if (options.token) {
      options.persistence.saveToken(options.token);
    }
    const token = await getToken(options);
    options.backend.initialize(story, token, options);
    return true;
  }
};

export const kcomnu = (fakeOptions?: IUnmockOptions) => {
  const options = fakeOptions ? { ...defaultOptions, ...fakeOptions } : defaultOptions;
  options.backend.reset();
};
