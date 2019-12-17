import * as _ from "lodash";
import { responseCreatorFactory } from "../generator";
import {
  CreateResponse,
  IFaker,
  IListener,
  ISerializedRequest,
  ISerializedResponse,
  IUnmockOptions,
  ServiceStoreType,
} from "../interfaces";
import {
  IRandomNumberGenerator,
  randomNumberGenerator,
} from "../random-number-generator";
import { addFromNock, NockAPI, ServiceStore } from "../service/serviceStore";

export interface IFakerOptions {
  listeners?: IListener[];
  serviceStore: ServiceStore;
  randomNumberGenerator?: IRandomNumberGenerator;
}

const DEFAULT_OPTIONS: IUnmockOptions = {
  useInProduction: () => true,
  isWhitelisted: (__: string) => false,
  randomize: () => true,
  log: (__: string) => {}, // tslint:disable-line:no-empty
};

export default class UnmockFaker implements IFaker {
  public createResponse: CreateResponse;
  /**
   * Add a new service to the faker using `nock` syntax.
   */
  public readonly nock: NockAPI;
  private readonly serviceStore: ServiceStore;
  private readonly randomNumberGenerator: IRandomNumberGenerator;
  private readonly listeners: IListener[];
  /**
   * Unmock faker. Creates fake responses to fake requests, using
   * the services contained in `serviceStore`.
   * Add new services with the `faker.nock` method.
   * @param options Options for creating the object.
   */
  public constructor({
    listeners,
    randomNumberGenerator: rng,
    serviceStore,
  }: IFakerOptions) {
    this.listeners = listeners ? listeners : [];
    this.randomNumberGenerator = rng || randomNumberGenerator({});
    this.serviceStore = serviceStore;
    this.createResponse = this.createResponseCreator();
    this.nock = addFromNock(this.serviceStore);
  }

  /**
   * Create a new faker function from the given options.
   * @param options Options for faking responses.
   */
  public setOptions(options: IUnmockOptions) {
    this.createResponse = this.createResponseCreator(options);
  }

  /**
   * Generate a fake response to a request.
   * @param request Serialized request.
   * @throws Error if no matcher was found for the request.
   * @returns Serialized response.
   */
  public generate(request: ISerializedRequest): ISerializedResponse {
    return this.createResponse(request);
  }

  /**
   * Services dictionary mapping service name to `Service` object.
   */
  public get services(): ServiceStoreType {
    return (this.serviceStore && this.serviceStore.services) || {};
  }

  /**
   * Reset the states of all services.
   */
  public reset() {
    this.serviceStore.resetServices();
  }

  private createResponseCreator(options?: IUnmockOptions): CreateResponse {
    return responseCreatorFactory({
      listeners: this.listeners,
      options: options || DEFAULT_OPTIONS,
      rng: this.randomNumberGenerator,
      store: this.serviceStore,
    });
  }
}
