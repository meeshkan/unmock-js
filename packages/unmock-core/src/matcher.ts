import {
  IMock,
  IMockRequest,
  ISerializedRequest,
  ISerializedResponse,
} from "./interfaces";

type RequestComparator = (
  intercepted: ISerializedRequest,
  mock: IMockRequest,
) => boolean;

function propertyMatches(
  property: keyof (ISerializedRequest & IMockRequest),
  interceptedRequest: ISerializedRequest,
  mockRequest: IMockRequest,
): boolean {
  const mockRequestProperty = mockRequest[property];
  const interceptedRequestProperty = interceptedRequest[property];

  if (mockRequestProperty === undefined) {
    return true;
  }

  if (mockRequestProperty instanceof RegExp) {
    return mockRequestProperty.test(interceptedRequestProperty);
  }

  return mockRequestProperty === interceptedRequestProperty;
}

const requestsMatch: RequestComparator = (
  interceptedRequest,
  mockRequest,
): boolean => {
  return (
    propertyMatches("protocol", interceptedRequest, mockRequest) &&
    propertyMatches("host", interceptedRequest, mockRequest) &&
    propertyMatches("path", interceptedRequest, mockRequest) &&
    propertyMatches("method", interceptedRequest, mockRequest)
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
