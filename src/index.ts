import isNode from "detect-node";
import ax from "./axios";
import getToken from "./token";
import { IUnmockInternalOptions, IUnmockOptions } from "./unmock-options";

if (isNode) {
  (global as any).__non_webpack_require__ = require;
}

const defaultOptions: IUnmockInternalOptions = {
  logger: isNode ?
    new (__non_webpack_require__("./logger/winston-logger").default)() :
    new (require("./logger/browser-logger").default)(),
  persistence: isNode ?
    new (__non_webpack_require__("./persistence/fs-persistence").default)() :
    new (require("./persistence/local-storage-persistence").default)(),
  save: false,
  unmockHost: "api.unmock.io",
  unmockPort: "443",
  whitelist: ["127.0.0.1", "127.0.0.0", "localhost"],
};

export const axios = ax;

export const unmock = async (fakeOptions?: IUnmockOptions) => {
  const options = fakeOptions ? { ...defaultOptions, ...fakeOptions } : defaultOptions;
  const story = {
    story: [],
  };
  if (options.token) {
    options.persistence.saveToken(options.token);
  }
  const token = await getToken(options);
  (isNode ? __non_webpack_require__("./node") : require("./jsdom")).initialize(story, token, options);
  return true;
};

export const kcomnu = () => {
  (isNode ? require("./node") : require("./jsdom")).reset();
};

export const unmockDev = async (fakeOptions?: IUnmockOptions) => {
  if (process.env.NODE_ENV !== "production") {
    const devOptions = { ...{ ignore: "story"}, ...defaultOptions };
    const options = fakeOptions
      ? { ...devOptions, ...fakeOptions }
      : devOptions;
    await unmock(options);
  }
};
