import jsYaml from "js-yaml";
import { IServiceDef, IServiceDefFile, IServiceParser } from "../interfaces";
import { Service } from "./service";

const PATTERN_FOR_KNOWN_FILENAMES = /^(?:index|spec|openapi)\.ya?ml$/;

export class ServiceParser implements IServiceParser {
  public parse(serviceDef: IServiceDef): Service {
    const name = serviceDef.directoryName;
    const serviceFiles = serviceDef.serviceFiles;

    const matchingFiles = serviceFiles.filter(
      (serviceDefFile: IServiceDefFile) =>
        PATTERN_FOR_KNOWN_FILENAMES.test(serviceDefFile.basename),
    );

    if (matchingFiles.length === 0) {
      throw new Error(
        `No idea what to do with: ${JSON.stringify(serviceFiles)}`,
      );
    }

    const serviceFile = matchingFiles[0];

    const contents: string =
      serviceFile.contents instanceof Buffer
        ? serviceFile.contents.toString("utf-8")
        : serviceFile.contents;

    const schema = jsYaml.safeLoad(contents);

    return new Service({ schema, name });
  }
}
