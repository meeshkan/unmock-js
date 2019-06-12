import {
  IMock,
  ISerializedRequest,
  ISerializedResponse,
} from "./http-serialized";

import debug from "debug";

const log = debug("unmock-matcher:comparator");

export type RequestComparator = (
  intercepted: ISerializedRequest,
  mock: ISerializedRequest,
) => boolean;

export const requestsMatch: RequestComparator = (
  interceptedRequest,
  mockRequest,
): boolean => {
  function strictEqualMatch(property: keyof ISerializedRequest): boolean {
    const isMatch = interceptedRequest[property] === mockRequest[property];

    if (!isMatch) {
      log(
        `Mismatch in ${property}: request ${JSON.stringify(
          interceptedRequest,
        )}, mock: ${JSON.stringify(mockRequest)}`,
      );
      return false;
    }
    return true;
  }

  return (
    strictEqualMatch("hostname") &&
    strictEqualMatch("pathname") &&
    strictEqualMatch("method")
  );
};

export class HttpRequestMatcher {
  private readonly mockIterable: () => Iterable<IMock>;
  constructor(mockIterable: () => Iterable<IMock>) {
    this.mockIterable = mockIterable;
  }

  public match(serializedRequest: ISerializedRequest): ISerializedResponse {
    for (const mock of this.mockIterable()) {
      if (requestsMatch(serializedRequest, mock.request)) {
        return mock.response;
      }
    }
    throw new Error("No matching mock found");
  }
}
