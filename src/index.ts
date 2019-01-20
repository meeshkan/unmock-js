import isNode from "detect-node";
import winston from "winston";
import ax from "./axios";
import getToken from "./token";
import { IUnmockInternalOptions, IUnmockOptions } from "./unmock-options";

const logger = winston.createLogger({
  levels: { unmock: 2},
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
         winston.format.simple(),
      ),
      level: "unmock",
    }),
  ],
});

winston.addColors({ unmock: "cyan bold" });
const defaultOptions: IUnmockInternalOptions = {
  save: false,
  saveCallback: () => { /* */ },
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
  const token = await getToken(options);
  (isNode ? require("./node") : require("./jsdom")).initialize(story, token, options);
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
