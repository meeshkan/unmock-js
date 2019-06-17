import {
  FindResponse,
  httpRequestMatcherFactory,
  IMock,
  ISerializedRequest,
} from "unmock-core";

interface IResponseFinderInput {
  mocksOpt?: IMock[];
}

type ResponseFinderFactory = (opts?: IResponseFinderInput) => FindResponse;

export const responseFinderFactory: ResponseFinderFactory = (
  opts?: IResponseFinderInput,
) => {
  // TODO Actual implementation for finding available mocks
  const mocks = (opts && opts.mocksOpt) || [];

  const httpRequestMatcher = httpRequestMatcherFactory(() => mocks);

  return (req: ISerializedRequest) => httpRequestMatcher(req);
};
