// import debug from "debug";
import * as _ from "lodash";
import { responseCreatorFactory } from "../generator";
import {
  CreateResponse,
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
import { ServiceStore } from "../service/serviceStore";

// const debugLog = debug("unmock:faker");

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

export default class UnmockFaker {
  public createResponse: CreateResponse;
  private readonly serviceStore: ServiceStore;
  private readonly randomNumberGenerator: IRandomNumberGenerator;
  private readonly listeners: IListener[];

  public constructor({
    listeners,
    randomNumberGenerator: rng,
    serviceStore,
  }: IFakerOptions) {
    this.listeners = listeners ? listeners : [];
    this.randomNumberGenerator = rng || randomNumberGenerator({});
    this.serviceStore = serviceStore;
    this.createResponse = this.createResponseCreator();
  }

  public setOptions(options: IUnmockOptions) {
    this.createResponse = this.createResponseCreator(options);
  }

  public fake(request: ISerializedRequest): ISerializedResponse {
    return this.createResponse(request);
  }

  public get services(): ServiceStoreType {
    return (this.serviceStore && this.serviceStore.services) || {};
  }

  public reset() {
    if (this.serviceStore) {
      // TODO - this is quite ugly :shrug:
      Object.values(this.serviceStore.services).forEach(service =>
        service.reset(),
      );
    }
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
