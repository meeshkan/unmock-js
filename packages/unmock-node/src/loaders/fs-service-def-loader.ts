import debug from "debug";
import fs from "fs";
import path from "path";

const DEFAULT_SERVICE_SUBDIRECTORY = "__unmock__";

export interface IFsServiceDefLoaderOptions {
  servicesDir?: string;
}

export interface IServiceDefLoader {
  load(): Promise<IServiceDef[]>;
  loadSync(): IServiceDef[];
}

export type ServiceDefParser = (input: IServiceDef) => IService;

export interface IServiceFile {
  /**
   * Basename for the file: for example, `index.yaml`
   */
  basename: string;
  /**
   * Contents of the file
   */
  contents: string | Buffer;
}

export interface IService {
  name: string;
}

/**
 * Input to the service parser. Contains the directory name and all files in the directory.
 */
export interface IServiceDef {
  directoryName: string;
  serviceFiles: IServiceFile[];
}

const debugLog = debug("unmock:file-system-store");

/**
 * Read services from file system. Base directory is either
 * 1. Injected directory
 * 2. Environment variable
 * 3. ${process.cwd()}/__unmock__
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
      directoryName: path.basename(absoluteDirectory),
      serviceFiles,
    };
  }
  private readonly servicesDirOpt?: string;
  private readonly createDirectories: boolean;

  public constructor(options: IFsServiceDefLoaderOptions) {
    this.servicesDirOpt = (options && options.servicesDir) || undefined;
    this.createDirectories = false;
  }

  public async load(): Promise<IServiceDef[]> {
    return this.loadSync(); // Simple wrap in promise for now
  }

  public loadSync(): IServiceDef[] {
    return this.loadServiceDefs();
  }

  public loadServiceDefs(): IServiceDef[] {
    const servicesDirectory: string = this.servicesDirectory;
    const serviceDirectories = fs
      .readdirSync(servicesDirectory)
      .map((f: string) => path.join(servicesDirectory, f))
      .filter((f: string) => fs.statSync(f).isDirectory());

    debugLog(`Found ${serviceDirectories.length} service directories`);

    const serviceParserInputs = serviceDirectories.map((dir: string) =>
      FsServiceDefLoader.readServiceDirectory(dir),
    );
    return serviceParserInputs;
  }

  /**
   * Resolve the absolute path to the directory where services live, with the flow:
   * 1. Injected directory
   * 2. Environment variable
   * 3. ${process.cwd()}/__unmock__
   */
  private get servicesDirectory() {
    const servicesDirectory = path.resolve(
      this.servicesDirOpt ||
        process.env.UNMOCK_SERVICES_DIRECTORY ||
        path.join(process.cwd(), DEFAULT_SERVICE_SUBDIRECTORY),
    );

    debugLog(`Resolved services directory: ${servicesDirectory}`);
    if (fs.existsSync(servicesDirectory)) {
      return servicesDirectory;
    }

    if (!this.createDirectories) {
      throw new Error(`Directory ${servicesDirectory} does not exist`);
    }

    // TODO Create directories?
    throw new Error("Directory creation not implemented");
  }
}
