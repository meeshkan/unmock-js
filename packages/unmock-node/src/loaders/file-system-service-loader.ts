import debug from "debug";
import fs from "fs";
import path from "path";

const DEFAULT_SERVICE_SUBDIRECTORY = "__unmock__";

export interface IFileSystemServiceLoaderOptions {
  servicesDir?: string;
}

export interface IService {
  name: string;
}

export interface IServiceLoader {
  load(): Promise<IService[]>;
  loadSync(): IService[];
}

export type ServiceParser = (input: IServiceParserInput) => IService;

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

/**
 * Input to the service parser. Contains the directory name and all files in the directory.
 */
export interface IServiceParserInput {
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
export class FileSystemServiceLoader implements IServiceLoader {
  /**
   * Read service parser input from directory containing all the files for a given service.
   * @param absoluteDirectory Absolute path to service directory. For example, /.../__unmock__/petstore/
   */
  public static readServiceDirectory(
    absoluteDirectory: string,
  ): IServiceParserInput {
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

  public constructor(options: IFileSystemServiceLoaderOptions) {
    this.servicesDirOpt = (options && options.servicesDir) || undefined;
    this.createDirectories = false;
  }

  public async load(): Promise<IService[]> {
    return this.loadSync(); // Simple wrap in promise for now
  }

  public serviceParser(serviceParserInput: IServiceParserInput) {
    return {
      name: serviceParserInput.directoryName,
    };
  }

  public loadSync(): IService[] {
    const serviceParserInputs = this.loadServiceParserInputs();
    return serviceParserInputs.map((serviceParserInput: IServiceParserInput) =>
      this.serviceParser(serviceParserInput),
    );
  }

  public loadServiceParserInputs(): IServiceParserInput[] {
    const servicesDirectory: string = this.servicesDirectory;
    const serviceDirectories = fs
      .readdirSync(servicesDirectory)
      .map((f: string) => path.join(servicesDirectory, f))
      .filter((f: string) => fs.statSync(f).isDirectory());

    debugLog(`Found ${serviceDirectories.length} service directories`);

    const serviceParserInputs = serviceDirectories.map((dir: string) =>
      FileSystemServiceLoader.readServiceDirectory(dir),
    );
    return serviceParserInputs;
  }

  /**
   * Resolve the absolute path to the directory where services live, with the flow:
   * 1. Injected directory
   * 2. Environment variable
   * 3. ${process.cwd()}/__unmock__
   */
  public get servicesDirectory() {
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

    // TODO Create
    throw new Error("Directory creation not implemented");
  }
}
