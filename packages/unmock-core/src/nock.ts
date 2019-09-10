import NodeBackend from "./backend";
import { HTTPMethod } from "./interfaces";
import { Service } from "./service";
import { Schema } from "./service/interfaces";

type UpdateCallback = ({
  statusCode,
  data,
}: {
  statusCode: number;
  data: Schema;
}) => Service | undefined;

// Placeholder for poet input type, to have
// e.g. standard object => { type: "object", properties: { ... }}, number => { type: "number", const: ... }
type InputToPoet = any;

export class DynamicServiceSpec {
  private statusCode: number = 200; // TODO default success statuscode per verb?
  private data: Schema = {};

  constructor(private updater: UpdateCallback) {}

  // TODO: Should this allow fluency for consecutive .get, .post, etc on the same service?
  public reply(statusCode: number, data?: InputToPoet): Service | undefined;
  public reply(data: InputToPoet): Service | undefined;
  public reply(
    maybeStatusCode: number | InputToPoet,
    maybeData?: InputToPoet,
  ): Service | undefined {
    if (maybeData !== undefined) {
      this.data = maybeData as Schema; // TODO: use poet to convert to JSON Schema?
      this.statusCode = maybeStatusCode;
    } else if (
      typeof maybeStatusCode === "number" &&
      maybeStatusCode >= 100 &&
      maybeStatusCode < 599
    ) {
      // we assume it's a status code
      this.statusCode = maybeStatusCode;
    } else {
      this.data = maybeStatusCode as Schema; // TODO: ditto
    }
    return this.updater({ data: this.data, statusCode: this.statusCode });
  }
}

export const nockify = ({
  backend,
  baseUrl,
  name,
}: {
  backend: NodeBackend;
  baseUrl: string;
  name?: string;
}) => {
  const dynFn = (method: HTTPMethod, endpoint: string) => ({
    statusCode,
    data,
  }: {
    statusCode: number;
    data: Schema;
  }) =>
    backend.updateServices({
      baseUrl,
      method,
      endpoint: endpoint.startsWith("/") ? endpoint : `/${endpoint}`,
      statusCode,
      response: data,
      name,
    });
  return {
    get(endpoint: string) {
      return new DynamicServiceSpec(dynFn("get", endpoint));
    },
    head(endpoint: string) {
      return new DynamicServiceSpec(dynFn("head", endpoint));
    },
    post(endpoint: string) {
      return new DynamicServiceSpec(dynFn("post", endpoint));
    },
    put(endpoint: string) {
      return new DynamicServiceSpec(dynFn("put", endpoint));
    },
    patch(endpoint: string) {
      return new DynamicServiceSpec(dynFn("patch", endpoint));
    },
    delete(endpoint: string) {
      return new DynamicServiceSpec(dynFn("delete", endpoint));
    },
    options(endpoint: string) {
      return new DynamicServiceSpec(dynFn("options", endpoint));
    },
    trace(endpoint: string) {
      return new DynamicServiceSpec(dynFn("trace", endpoint));
    },
  };
};
