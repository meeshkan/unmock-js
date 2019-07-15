import { isLeft } from "fp-ts/lib/Either";
import jsYaml from "js-yaml";
import loas3 from "loas3";
import path from "path";
import { IServiceDef, IServiceDefFile, IServiceParser } from "../interfaces";
import { isOpenAPIObject } from "./interfaces";
import { Service } from "./service";

export class ServiceParser implements IServiceParser {
  private static KNOWN_FILENAMES: RegExp = /^.*\.(ya?ml|json)$/i;

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

    for (const maybeServiceFile of matchingFiles) {
      const specExt = path.extname(maybeServiceFile.basename);

      const contents: string =
        maybeServiceFile.contents instanceof Buffer
          ? maybeServiceFile.contents.toString("utf-8")
          : maybeServiceFile.contents;

      const maybeSchema =
        specExt === ".json" ? JSON.parse(contents) : jsYaml.safeLoad(contents);
      if (!isOpenAPIObject(maybeSchema)) {
        continue;
      }

      const schema = loas3(maybeSchema);
      if (isLeft(schema)) {
        throw new Error(
          [
            "The following errors occured while parsing your loas3 schema",
            ...schema.left.map(i => `  ${i.message}`),
          ].join("\n"),
        );
      }

      // TODO Maybe read from the schema first
      const name = serviceDef.directoryName;

      return new Service({
        name,
        schema: schema.right,
      });
    }

    throw new Error(`Could not load schema from '${serviceDef.directoryName}'`);
  }
}
