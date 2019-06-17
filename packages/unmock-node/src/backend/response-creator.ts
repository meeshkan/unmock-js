import {
  FindResponse,
  httpRequestMatcherFactory,
  IMock,
  ISerializedRequest,
} from "unmock-core";

interface IResponseCreator {
  mockGenerator: () => IMock[];
}

export type ResponseCreatorFactory = (opts: IResponseCreator) => FindResponse;

export const responseCreatorFactory: ResponseCreatorFactory = (
  opts: IResponseCreator,
) => {
  // TODO Actual implementation for finding available mocks
  const httpRequestMatcher = httpRequestMatcherFactory(opts.mockGenerator);
  return (req: ISerializedRequest) => httpRequestMatcher(req);
};
