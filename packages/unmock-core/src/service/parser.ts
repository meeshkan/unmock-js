import jsYaml from "js-yaml";
import { IServiceDef, IServiceDefFile, IServiceParser } from "../interfaces";
import { Service } from "./service";

export class ServiceParser implements IServiceParser {
  private static KNOWN_FILENAMES: RegExp = /^(?:index|spec|openapi)\.ya?ml$/i;

  public parse(serviceDef: IServiceDef): Service {
    const serviceFiles = serviceDef.serviceFiles;

    const matchingFiles = serviceFiles.filter(
      (serviceDefFile: IServiceDefFile) =>
        ServiceParser.KNOWN_FILENAMES.test(serviceDefFile.basename),
    );

    if (matchingFiles.length === 0) {
      throw new Error(
        `Cannot find known service specification from: ${JSON.stringify(
          serviceFiles,
        )}`,
      );
    }

    const serviceFile = matchingFiles[0];

    const contents: string =
      serviceFile.contents instanceof Buffer
        ? serviceFile.contents.toString("utf-8")
        : serviceFile.contents;

    const schema = jsYaml.safeLoad(contents);

    // TODO Maybe read from the schema first
    const name = serviceDef.directoryName;

    return new Service({
      name,
      schema,
    });
  }
}
