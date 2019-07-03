import { ISerializedRequest } from "../interfaces";
import {
  IService,
  IServiceInput,
  IStateInput,
  MatcherResponse,
  OpenAPIObject,
  HTTPMethod,
} from "./interfaces";
import { OASMatcher } from "./matcher";
import { State } from "./state/state";
import { DEFAULT_STATE_ENDPOINT } from "./constants";

export class Service implements IService {
  public readonly name: string;
  private hasPaths: boolean = false;
  private readonly oasSchema: OpenAPIObject;
  private readonly matcher: OASMatcher;
  private readonly state: State;

  constructor(opts: IServiceInput) {
    this.oasSchema = opts.schema;
    this.name = opts.name;
    this.hasPaths = // Find this once, as schema is immutable
      this.schema !== undefined &&
      this.schema.paths !== undefined &&
      Object.keys(this.schema.paths).length > 0;
    this.matcher = new OASMatcher({ schema: this.schema });
    this.state = new State();
  }

  get schema(): OpenAPIObject {
    return this.oasSchema;
  }

  get hasDefinedPaths(): boolean {
    return this.hasPaths;
  }

  public match(sreq: ISerializedRequest): MatcherResponse {
    return this.matcher.matchToOperationObject(sreq);
  }

  public updateState(stateInput: IStateInput) {
    if (!this.hasDefinedPaths) {
      throw new Error(`'${this.name}' has no defined paths!`);
    }
    const { endpoint } = stateInput;
    const schemaEndpoint =
      endpoint !== DEFAULT_STATE_ENDPOINT
        ? this.matcher.findEndpoint(endpoint)
        : endpoint;
    if (schemaEndpoint === undefined) {
      throw new Error(`Can't find endpoint '${endpoint}' in '${this.name}'`);
    }

    const err = this.state.update({
      stateInput,
      serviceName: this.name,
      schemaEndpoint,
      paths: this.schema.paths,
    });
    if (err !== undefined) {
      throw new Error(err);
    }
  }

  public getState(method: HTTPMethod, endpoint: string) {
    const schemaEndpoint = this.matcher.findEndpoint(endpoint);
    if (schemaEndpoint === undefined) {
      return undefined;
    }
    const operationSchema = this.schema.paths[schemaEndpoint][method];
    if (operationSchema === undefined) {
      return undefined;
    }

    return this.state.getState(method, endpoint, operationSchema);
  }
}
