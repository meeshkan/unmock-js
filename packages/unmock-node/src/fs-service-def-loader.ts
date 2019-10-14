import debug from "debug";
import * as fs from "fs";
import { flatMap } from "lodash";
import * as path from "path";
import { IServiceDef, IServiceDefLoader } from "unmock-core";
import { resolveUnmockDirectories } from "./utils";

const debugLog = debug("unmock:fs-service-def-loader");

/**
 * Read services from file system. Base directory is either
 * 1. Directory injected in configuration
 * 2. Environment variable `UNMOCK_SERVICES_DIRECTORY`
 * 3. `${process.cwd()}/__unmock__`
 */
export class FsServiceDefLoader implements IServiceDefLoader {
  /**
   * Read service parser input from directory containing all the files for a given service.
   * @param absoluteDirectory Absolute path to service directory. For example, /path/to/__unmock__/petstore/
   * @returns Input for service parser to parse a service
   */
  public static readServiceDirectory(absoluteDirectory: string): IServiceDef {
    const serviceFiles = fs
      .readdirSync(absoluteDirectory)
      .map((fileName: string) => path.join(absoluteDirectory, fileName))
      .filter((fileName: string) => fs.statSync(fileName).isFile())
      .map((f: string) => ({
        basename: path.basename(f),
        contents: fs.readFileSync(f).toString("utf-8"),
      }));

    return {
      absolutePath: absoluteDirectory,
      directoryName: path.basename(absoluteDirectory),
      serviceFiles,
    };
  }

  public static loadSyncUnmockDirectory(unmockDirectory: string) {
    if (
      !(
        fs.existsSync(unmockDirectory) &&
        fs.statSync(unmockDirectory).isDirectory()
      )
    ) {
      throw new Error(`Directory ${unmockDirectory} does not exist.`);
    }
    debugLog(`Reading services from ${unmockDirectory}`);
    const serviceDirectories = fs
      .readdirSync(unmockDirectory)
      .map((f: string) => path.join(unmockDirectory, f))
      .filter((f: string) => fs.statSync(f).isDirectory());
    debugLog(
      `Found ${serviceDirectories.length} services in ${unmockDirectory}`,
    );
    const serviceDefs = serviceDirectories.map((dir: string) =>
      FsServiceDefLoader.readServiceDirectory(dir),
    );
    return serviceDefs;
  }

  private readonly unmockDirectories: string[];

  public constructor(options: { unmockDirectories: string[] }) {
    this.unmockDirectories = options.unmockDirectories;
  }

  /**
   * Asynchronously read service definitions.
   */
  public async load(): Promise<IServiceDef[]> {
    return this.loadSync(); // Simple wrap in promise for now
  }

  /**
   * Synchronously read service definitions.
   */
  public loadSync(): IServiceDef[] {
    return flatMap(this.unmockDirectories, (directory: string) =>
      FsServiceDefLoader.loadSyncUnmockDirectory(directory),
    );
  }
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
