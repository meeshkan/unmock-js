/**
 * Implements the logic for generating a response from a service file
 */
// Try fixing broken imports in Node <= 8 by using require instead of default import
import { responseCreatorFactory2 } from "./generator-experimental";
import {
  CreateResponse,
  IListener,
  IUnmockOptions,
} from "./interfaces";
import { ServiceStore } from "./service/serviceStore";

export function responseCreatorFactory({
  listeners = [],
  options,
  store,
}: {
  listeners?: IListener[];
  options: IUnmockOptions;
  store: ServiceStore;
}): CreateResponse {
    return responseCreatorFactory2({
      listeners,
      options,
      store,
    });
}
