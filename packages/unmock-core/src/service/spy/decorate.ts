import { match, SinonMatcher } from "sinon";
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
  postRequestBody(matcher?: SinonMatcher): any;
  postResponseBody(): any;
}

const verifyOnlyOneCall = ({
  spy,
  errPrefix,
}: {
  spy: UnmockServiceSpy;
  errPrefix: string;
}): UnmockServiceSpy => {
  const callCount = spy.callCount;
  if (callCount !== 1) {
    throw Error(
      `${errPrefix}: Expected one matching call, got ${callCount} calls`,
    );
  }
  return spy;
};

const postMethods = {
  postHost(this: UnmockServiceSpy): string {
    const spyWithPost = this.withMethod("post");
    verifyOnlyOneCall({ spy: spyWithPost, errPrefix: "postHost" });
    return spyWithPost.firstCall.args[0].host;
  },
  postPath(this: UnmockServiceSpy): string {
    const spyWithPost = this.withMethod("post");
    verifyOnlyOneCall({ spy: spyWithPost, errPrefix: "postPath" });
    return spyWithPost.firstCall.args[0].path;
  },
  postRequestBody(this: UnmockServiceSpy, matcher?: SinonMatcher): any {
    const spyWithPost = this.withMethod("post");
    const spyMatched = matcher
      ? decorateSpy(spyWithPost.withArgs(matcher))
      : spyWithPost;
    verifyOnlyOneCall({ spy: spyMatched, errPrefix: "postRequestBody" });
    return spyMatched.firstCall.args[0].body;
  },
  postResponseBody(this: UnmockServiceSpy): any {
    const spyWithPost = this.withMethod("post");
    verifyOnlyOneCall({ spy: spyWithPost, errPrefix: "postResponseBody" });
    return spyWithPost.firstCall.args[0].body;
  },
};

const customSpyMethods: ISpyDecoration = { ...helperMethods, ...postMethods };

export default decorateSpy;
