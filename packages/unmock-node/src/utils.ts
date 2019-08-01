import debug from "debug";
import fs from "fs";
import path from "path";

const debugLog = debug("unmock:node:utils");

const DEFAULT_SERVICE_SUBDIRECTORY = "__unmock__";

/**
 * Resolve the absolute path to the directory where services live, with the flow:
 * 1. Injected directory
 * 2. Environment variable
 * 3. ${process.cwd()}/__unmock__
 */
// TODO: Use `app-root-path` instead of `process.cwd()`?
export const resolveServicesDirectory = (servicesDirOpt?: string) => {
  const servicesDirectory = path.resolve(
    servicesDirOpt ||
      process.env.UNMOCK_SERVICES_DIRECTORY ||
      path.join(process.cwd(), DEFAULT_SERVICE_SUBDIRECTORY),
  );

  debugLog(`Resolved services directory: ${servicesDirectory}`);
  if (
    fs.existsSync(servicesDirectory) &&
    fs.statSync(servicesDirectory).isDirectory()
  ) {
    return servicesDirectory;
  }

  throw new Error(`Directory ${servicesDirectory} does not exist`);
};
