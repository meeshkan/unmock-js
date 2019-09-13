import { ServiceStoreType } from "./service/interfaces";
import { AllowedHosts } from "./settings/allowedHosts";

export { ServiceStoreType };

const RESTMethodTypes = [
  "get",
  "head",
  "post",
  "put",
  "patch",
  "delete",
  "options",
  "trace",
] as const;

export type HTTPMethod = typeof RESTMethodTypes[number];

export const isRESTMethod = (maybeMethod: string): maybeMethod is HTTPMethod =>
  RESTMethodTypes.toString().includes(maybeMethod.toLowerCase());

export interface ILogger {
  log(message: string): void;
}

export interface IListenerInput {
  req: ISerializedRequest;
  res?: ISerializedResponse;
}

export interface IListener {
  notify(input: IListenerInput): void;
}

export interface IUnmockOptions extends ILogger {
  useInProduction(): boolean;
  isWhitelisted(url: string): boolean;
  flaky(): boolean;
}

export interface IUnmockPackage {
  /**
   * List of whitelisted hosts/endpoints. These will not be intercepted by unmock.
   * Supports wildcards and regular expressions.
   */
  allowedHosts: AllowedHosts;

  /**
   * A mapping of service name to a service object.
   * Allows you to access a service spy, modify a state, etc.
   */
  services: ServiceStoreType;

  /**
   * Starts intercepting outgoing requests.
   */
  on(): IUnmockPackage;

  /**
   * Alias for on()
   */
  init(): IUnmockPackage;

  /**
   * Alias for on()
   */
  initialize(): IUnmockPackage;

  /**
   * Stops intercepting outgoing requests. Spies and states are reset.
   */
  off(): void;

  /**
   * Reloads all services for unmock.
   * Any dynamically-defined services will be deleted.
   */
  reloadServices(): void;

  /**
   * Resets the state and spies for all services.
   */
  reset(): void;
}

/**
 * Analogous to `IncomingHttpHeaders` in @types/node.
 * Header names are expected to be _lowercased_.
 */
export interface IIncomingHeaders {
  [header: string]: string | string[] | undefined;
}

/**
 * Analogous to `OutgoingHttpHeaders` in @types/node.
 * Allows numbers as they are converted to strings internally.
 */
export interface IOutgoingHeaders {
  [header: string]: string | string[] | number | undefined;
}

export interface IIncomingQuery {
  [key: string]: string | string[] | undefined;
}

export interface ISerializedRequest {
  body?: string | object;
  headers?: IIncomingHeaders;
  host: string;
  method: HTTPMethod;
  /**
   * Full path containing query parameters
   */
  path: string;
  /**
   * Path name not containing query parameters
   */
  pathname: string;
  /**
   * Query parameters
   */
  query: IIncomingQuery;
  protocol: "http" | "https";
}

export interface ISerializedResponse {
  body?: string;
  headers?: IOutgoingHeaders;
  statusCode: number;
}

export type CreateResponse = (
  request: ISerializedRequest,
) => ISerializedResponse | undefined;

export interface IServiceDefFile {
  /**
   * Basename for the service definition file: for example, `index.yaml`.
   */
  basename: string;
  /**
   * Contents of the service definition file
   */
  contents: string | Buffer;
}

/**
 * Input to the service parser. Contains, e.g., the directory name and all available files.
 */
export interface IServiceDef {
  /**
   * Absolute path to the service directory
   */
  absolutePath: string;

  /**
   * Name of the service directory: for example, `petstore`.
   */

  directoryName: string;
  /**
   * All the files defining the service.
   */
  serviceFiles: IServiceDefFile[];
}
