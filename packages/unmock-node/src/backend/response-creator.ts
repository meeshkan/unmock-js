import {
  CreateResponse,
  httpRequestMatcherFactory,
  IMock,
  ISerializedRequest,
} from "unmock-core";

interface IResponseCreator {
  mockGenerator: () => IMock[];
}

export type ResponseCreatorFactory = (opts: IResponseCreator) => CreateResponse;

export const responseCreatorFactory: ResponseCreatorFactory = (
  opts: IResponseCreator,
) => {
  const httpRequestMatcher = httpRequestMatcherFactory(opts.mockGenerator);
  return (req: ISerializedRequest) => httpRequestMatcher(req);
};
