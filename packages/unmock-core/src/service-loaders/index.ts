import debug from "debug";
import * as _ from "lodash";
import { IServiceDef } from "../interfaces";
import { resolveUnmockDirectories } from "../utils";
import { FsServiceDefLoader } from "./fs-service-def-loader";

const debugLog = debug("unmock:node");

export interface IServiceDefLoader {
  loadSync(): IServiceDef[];
}

const createFsServiceDefLoader = (
  servicesDirectory?: string,
): IServiceDefLoader => {
  const unmockDirectories = servicesDirectory
    ? [servicesDirectory]
    : resolveUnmockDirectories();

  debugLog(`Found unmock directories: ${JSON.stringify(unmockDirectories)}`);
  return new FsServiceDefLoader({ unmockDirectories });
};

export default createFsServiceDefLoader;
