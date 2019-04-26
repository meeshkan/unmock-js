import { access } from "fs";
import * as importedConstants from "./constants";
import { IBackend, IStories, IUnmockOptions } from "./interfaces";
import { UnmockOptions } from "./options";
import { buildPath, endReporter, getUserId, makeAuthHeader } from "./util";

// top-level exports
export { UnmockOptions, Mode } from "./options";
export * from "./interfaces";
export const util = {
  buildPath,
  endReporter,
  makeAuthHeader,
};
export const constants = {
  MOSES: importedConstants.MOSES,
  UNMOCK_UA_HEADER_NAME: importedConstants.UNMOCK_UA_HEADER_NAME,
};

// First level indirection defines what to ignore
// Second level indirection provides basic/default options
// Third indirection provides the final call + optional parameters to modify
const baseIgnore = (ignore: any) => (opts?: UnmockOptions) => (
  maybeOptions?: IUnmockOptions,
) => {
  if (opts === undefined) {
    opts = new UnmockOptions();
  }
  opts.reset(maybeOptions);
  opts.addIgnore(ignore);
  return opts;
};

export const ignoreStory = baseIgnore("story");
export const ignoreAuth = baseIgnore({ headers: "Authorization" });

export const unmock = (baseOptions: UnmockOptions, backend: IBackend) => async (
  maybeOptions?: IUnmockOptions,
) => {
  const options = baseOptions.reset(maybeOptions);
  if (process.env.NODE_ENV !== "production" || options.useInProduction) {
    const story: IStories = { story: [] };
    const accessToken = await options.getAccessToken();
    const userId = await options.getUserId(accessToken);
    backend.initialize(userId, story, accessToken, options);
  }
};

export const kcomnu = (backend: IBackend) => () => {
  backend.reset();
};
