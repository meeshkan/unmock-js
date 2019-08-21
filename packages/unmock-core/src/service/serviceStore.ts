import { IService, IServiceCore, IServiceStore } from "./interfaces";
import { Service } from "./service";

export const ServiceStore = (coreServices: IServiceCore[]) =>
  new Proxy(
    coreServices.reduce(
      (o, core) => ({ ...o, [core.name]: new Service(core) }),
      {},
    ),
    getService,
  );

const getService = {
  get: (store: IServiceStore, serviceName: string): IService => {
    if (store[serviceName] !== undefined) {
      return store[serviceName];
    }
    throw new Error(`unmock: No service named '${serviceName}'!`);
  },
};
