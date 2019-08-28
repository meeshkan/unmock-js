import { match } from "sinon";
import { HTTPMethod } from "../../interfaces";
import { SinonSpy, UnmockServiceSpy } from "./types";

// Base helper methods used for higher-level methods
const helperMethods = {
  withMethod(this: SinonSpy, method: HTTPMethod) {
    return this.withArgs(match({ method }));
  },
};

type SpyHelperMethods = typeof helperMethods;

const postMethods = {
  postRequestBody(this: SinonSpy & SpyHelperMethods): any {
    const spyWithPost = this.withMethod("post");
    if (spyWithPost.callCount !== 1) {
      throw Error(
        `postRequestBody: Expected one post call, got ${spyWithPost.callCount}`,
      );
    }
    return spyWithPost.firstCall.args[0].body;
  },
  postResponseBody(this: SinonSpy & SpyHelperMethods): any {
    const spyWithPost = this.withMethod("post");
    if (spyWithPost.callCount !== 1) {
      throw Error(
        `postRequestBody: Expected one post call, got ${spyWithPost.callCount}`,
      );
    }
    return spyWithPost.firstCall.args[0].body;
  },
};

const customSpyMethods = { ...helperMethods, ...postMethods };

export type ISpyDecoration = typeof customSpyMethods;

/**
 * Add custom methods to spy
 * @param spy Sinon spy (NOTE: modified in-place!)
 */
const decorateSpy = (spy: SinonSpy): UnmockServiceSpy => {
  return Object.assign(spy, customSpyMethods);
};

export default decorateSpy;
