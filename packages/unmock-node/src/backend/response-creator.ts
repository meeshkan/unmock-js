import {
  CreateResponse,
  httpRequestMatcherFactory,
  IMock,
  ISerializedRequest,
} from "unmock-core";

interface IResponseCreatorFactoryInput {
  mockGenerator: () => IMock[];
}

export type ResponseCreatorFactory = (
  opts: IResponseCreatorFactoryInput,
) => CreateResponse;

export const responseCreatorFactory: ResponseCreatorFactory = (
  opts: IResponseCreatorFactoryInput,
) => {
  const httpRequestMatcher = httpRequestMatcherFactory(opts.mockGenerator);
  return (req: ISerializedRequest) => httpRequestMatcher(req);
};
