import { IMock, ISerializedRequest, ISerializedResponse } from "unmock-core";

import debug from "debug";

const log = debug("unmock-matcher:comparator");

type RequestComparator = (
  intercepted: ISerializedRequest,
  mock: ISerializedRequest,
) => boolean;

const requestsMatch: RequestComparator = (
  interceptedRequest,
  mockRequest,
): boolean => {
  function strictEqualMatch(property: keyof ISerializedRequest): boolean {
    const isMatch = interceptedRequest[property] === mockRequest[property];

    if (!isMatch) {
      log(
        `Mismatch in ${property.toString()}: request ${JSON.stringify(
          interceptedRequest,
        )}, mock: ${JSON.stringify(mockRequest)}`,
      );
      return false;
    }
    return true;
  }

  return (
    strictEqualMatch("host") &&
    strictEqualMatch("path") &&
    strictEqualMatch("method")
  );
};

type HttpRequestMatcher = (
  request: ISerializedRequest,
) => ISerializedResponse | undefined;

type HttpRequestMatcherFactory = (
  mockIterable: () => Iterable<IMock>,
) => HttpRequestMatcher;

/**
 * Build request matcher from mock iterable factory
 * @param mockIterable Factory of iterable producing mocks to match
 * @returns HttpRequestMatcher
 */
export const httpRequestMatcherFactory: HttpRequestMatcherFactory = (
  mockIterable: () => Iterable<IMock>,
) => (request: ISerializedRequest) => {
  for (const mock of mockIterable()) {
    if (requestsMatch(request, mock.request)) {
      return mock.response;
    }
  }
  return undefined;
};
