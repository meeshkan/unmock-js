import { isLeft } from "fp-ts/lib/Either";
import jsYaml from "js-yaml";
// @ts-ignore // missing type definitions
import deref from "json-schema-deref-sync";
import loas3 from "loas3";
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

    const schema = loas3(jsYaml.safeLoad(contents));
    if (isLeft(schema)) {
      throw new Error(
        [
          "The following errors occured while parsing your loas3 schema",
          ...schema.left.map(i => `  ${i.message}`),
        ].join("\n"),
      );
    }
    if (schema === undefined) {
      throw new Error(`Could not load schema from ${contents}`);
    }

    // TODO Maybe read from the schema first
    const name = serviceDef.directoryName;

    return new Service({
      name,
      schema: deref(schema.right, { baseFolder: serviceDef.absolutePath }),
    });
  }
}
