import * as path from "path";
import { IServiceDef } from "unmock-core";
import { FsServiceDefLoader } from "../fs-service-def-loader";

const RESOURCES_DIR = path.join(__dirname, "__unmock__");

describe("File system service def loader", () => {
  it("loads serviceDefs from existing directory", () => {
    const serviceDefLoader = new FsServiceDefLoader({
      unmockDirectories: [RESOURCES_DIR],
    });
    const serviceDefs: IServiceDef[] = serviceDefLoader.loadSync();
    expect(serviceDefs).toHaveLength(3);
    expect(serviceDefs.map((def: IServiceDef) => def.directoryName)).toEqual([
      "filestackApi",
      "petstore",
      "slack",
    ]);
  });
  it("loads serviceDefs from existing directory asynchronously", async () => {
    const serviceDefLoader = new FsServiceDefLoader({
      unmockDirectories: [RESOURCES_DIR],
    });
    const serviceDefs: IServiceDef[] = await serviceDefLoader.load();
    expect(serviceDefs).toHaveLength(3);
    expect(serviceDefs.map((def: IServiceDef) => def.directoryName)).toEqual([
      "filestackApi",
      "petstore",
      "slack",
    ]);
  });

  it("throws for a non-existing directory", () => {
    expect(() =>
      new FsServiceDefLoader({
        unmockDirectories: ["DEFINITELY_DOES_NOT_EXIST_I_HOPE"],
      }).loadSync(),
    ).toThrow(/does not exist/);
  });

  it("load serviceDefs from a single directory", () => {
    const absolutePath = path.join(RESOURCES_DIR, "petstore");
    const serviceDef = FsServiceDefLoader.readServiceDirectory(absolutePath);
    expect(serviceDef.directoryName).toBe("petstore");
    expect(serviceDef.serviceFiles).toHaveLength(1);

    const serviceFile = serviceDef.serviceFiles[0];
    expect(serviceFile.basename).toBe("spec.yaml");
    expect(serviceFile.contents).toEqual(
      expect.stringContaining('openapi: "3.0.0"'),
    );
  });
});
