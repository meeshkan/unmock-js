import { ISerializedRequest } from "../interfaces";
import { DEFAULT_STATE_ENDPOINT } from "./constants";
import {
  Dereferencer,
  HTTPMethod,
  IService,
  IServiceInput,
  IStateInput,
  MatcherResponse,
  OpenAPIObject,
} from "./interfaces";
import { OASMatcher } from "./matcher";
import { State } from "./state/state";
import { derefIfNeeded } from "./util";

export class Service implements IService {
  public readonly name: string;
  public readonly absPath: string;
  public readonly dereferencer: Dereferencer;
  private hasPaths: boolean = false;
  private readonly oasSchema: OpenAPIObject;
  private readonly matcher: OASMatcher;
  private readonly state: State;

  constructor(opts: IServiceInput) {
    this.oasSchema = opts.schema;
    this.name = opts.name;
    this.absPath = opts.absPath;
    this.hasPaths = // Find this once, as schema is immutable
      this.schema !== undefined &&
      this.schema.paths !== undefined &&
      Object.keys(this.schema.paths).length > 0;
    this.matcher = new OASMatcher({ schema: this.schema });
    this.state = new State();
    this.dereferencer = (objToDeref: any) =>
      derefIfNeeded(objToDeref, { schema: this.schema, absPath: this.absPath });
  }

  get schema(): OpenAPIObject {
    return this.oasSchema;
  }

  get hasDefinedPaths(): boolean {
    return this.hasPaths;
  }

  public match(sreq: ISerializedRequest): MatcherResponse {
    const maybeOp = this.matcher.matchToOperationObject(sreq);
    if (maybeOp === undefined) {
      return undefined;
    }

    const state = this.getState(sreq.method as HTTPMethod, sreq.path);
    return {
      operation: maybeOp,
      state,
      service: this,
    };
  }

  public resetState() {
    this.state.reset();
  }

  public updateState(stateInput: IStateInput) {
    if (!this.hasDefinedPaths) {
      throw new Error(`'${this.name}' has no defined paths!`);
    }
    const { endpoint } = stateInput;
    let schemaEndpoint = endpoint;
    if (endpoint !== DEFAULT_STATE_ENDPOINT) {
      const parsedEndpoint = this.matcher.findEndpoint(endpoint);
      if (parsedEndpoint === undefined) {
        throw new Error(`Can't find endpoint '${endpoint}' in '${this.name}'`);
      }
      schemaEndpoint = parsedEndpoint.schemaEndpoint;
    }

    this.state.update({
      stateInput,
      serviceName: this.name,
      schemaEndpoint,
      paths: this.schema.paths,
      dereferencer: this.dereferencer,
    });
  }

  public getState(method: HTTPMethod, endpoint: string) {
    // TODO at some point we'd probably want to move to regex for case insensitivity
    method = method.toLowerCase() as HTTPMethod;
    endpoint = endpoint.toLowerCase();
    const realEndpoint = this.matcher.findEndpoint(endpoint);
    if (realEndpoint === undefined) {
      return undefined;
    }
    const schemaEndpoint = realEndpoint.schemaEndpoint;
    const operationSchema = this.schema.paths[schemaEndpoint][method];
    if (operationSchema === undefined) {
      return undefined;
    }

    return this.state.getState(
      method,
      realEndpoint.normalizedEndpoint,
      operationSchema,
    );
  }
}
