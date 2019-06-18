/**
 * Implements the logic for generating a response from a service file
 */

import {
  CreateResponse,
  IResponseCreatorFactoryInput,
  ISerializedRequest,
} from "./interfaces";
import { httpRequestMatcherFactory } from "./matcher";

// TODO: Change this for json schema faker?
// TODO: json-schema-faker doesn't have @types definition, so instead
// TODO: we parse manually for now -- MVP hurray!
import faker from "faker";

export const responseCreatorFactory = (
  opts: IResponseCreatorFactoryInput,
): CreateResponse => {
  const httpRequestMatcher = httpRequestMatcherFactory(opts.mockGenerator);
  return (req: ISerializedRequest) => httpRequestMatcher(req);
};

export const genMockFromSerializedRequest = (sreq: ISerializedRequest) => {
  // 1. Use sreq to find the proper specification and, as needed, convert
  //    from short-hand notation to verbose OAS (Mike)
  // 2. Use sreq to fetch the relevant path in the OAS spec
  const { method, path } = sreq;
  // 3. Fetch state from DSL?
  // 4. Generate as needed.
};
