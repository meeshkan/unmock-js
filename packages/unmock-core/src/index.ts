import * as importedConstants from "./constants";
import { IBackend, IStories, IUnmockOptions } from "./interfaces";
import { UnmockOptions } from "./options";
import CompositeDeserializer from "./serialize/deserializer/composite";
import FormDeserializer from "./serialize/deserializer/form";
import JSONDeserializer from "./serialize/deserializer/json";
import CompositeSerializer from "./serialize/serializer/composite";
import FormSerializer from "./serialize/serializer/form";
import JSONSerializer from "./serialize/serializer/json";
import { buildPath, endReporter, getUserId, makeAuthHeader } from "./util";

export const serializer = {
  CompositeSerializer,
  FormSerializer,
  JSONSerializer,
};

export const deserializer = {
  CompositeDeserializer,
  FormDeserializer,
  JSONDeserializer,
};

// top-level exports
export { UnmockOptions, Mode } from "./options";
export * from "./interfaces";
export const util = {
  buildPath,
  endReporter,
  makeAuthHeader,
};
export const constants = {
  UNMOCK_UA_HEADER_NAME: importedConstants.UNMOCK_UA_HEADER_NAME,
};
export { snapshot } from "./snapshot";

const baseIgnore = (ignore: any) => (opts: UnmockOptions): UnmockOptions => {
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
    const accessToken = await options.token();
    const userId = accessToken ? await getUserId(options, accessToken) : null;
    backend.initialize(userId, story, accessToken, options);
  }
};

export const kcomnu = (backend: IBackend) => () => {
  backend.reset();
};
