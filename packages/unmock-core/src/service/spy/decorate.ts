import { match } from "sinon";
import { HTTPMethod } from "../../interfaces";
import { SinonSpy, UnmockServiceSpy } from "./types";

/**
 * Add custom methods to spy
 * @param spy Sinon spy (NOTE: modified in-place!)
 */
const decorateSpy = (spy: SinonSpy): UnmockServiceSpy => {
  return Object.assign(spy, customSpyMethods);
};

// Base helper methods used for higher-level methods
const helperMethods = {
  withMethod(this: UnmockServiceSpy, method: HTTPMethod): UnmockServiceSpy {
    return decorateSpy(this.withArgs(match({ method })));
  },
};

export interface ISpyDecoration {
  withMethod(method: HTTPMethod): UnmockServiceSpy;
  postRequestBody(): any;
  postResponseBody(): any;
}

const postMethods = {
  postRequestBody(this: UnmockServiceSpy): any {
    const spyWithPost = this.withMethod("post");
    if (spyWithPost.callCount !== 1) {
      throw Error(
        `postRequestBody: Expected one post call, got ${spyWithPost.callCount}`,
      );
    }
    return spyWithPost.firstCall.args[0].body;
  },
  postResponseBody(this: UnmockServiceSpy): any {
    const spyWithPost = this.withMethod("post");
    if (spyWithPost.callCount !== 1) {
      throw Error(
        `postRequestBody: Expected one post call, got ${spyWithPost.callCount}`,
      );
    }
    return spyWithPost.firstCall.args[0].body;
  },
};

const customSpyMethods: ISpyDecoration = { ...helperMethods, ...postMethods };

export default decorateSpy;
