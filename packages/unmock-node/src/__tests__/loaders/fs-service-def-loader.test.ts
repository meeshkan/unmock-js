import path from "path";
import {
  FsServiceDefLoader,
  IServiceDef,
} from "../../loaders/fs-service-def-loader";

const RESOURCES_DIR = path.join(__dirname, "resources");

describe("File system service loader", () => {
  it("discovers from existing directory", async () => {
    const serviceDefLoader = new FsServiceDefLoader({
      servicesDir: RESOURCES_DIR,
    });
    const serviceDefs: IServiceDef[] = await serviceDefLoader.load();
    expect(serviceDefs).toHaveLength(1);
    const serviceDef = serviceDefs[0];
    expect(serviceDef.directoryName).toBe("petstore");
  });

  it("throws for a non-existing directory", async () => {
    const serviceDefLoader = new FsServiceDefLoader({
      servicesDir: "DEFINITELY_DOES_NOT_EXIST_I_HOPE",
    });
    try {
      await serviceDefLoader.load();
    } catch (e) {
      expect(/does not exist/.test(e.message)).toBe(true);
      return;
    }
    throw new Error("Should not get here");
  });

  it("load serviceLoadables from existing directory", () => {
    const absolutePath = path.join(RESOURCES_DIR, "petstore");
    const serviceLoadable = FsServiceDefLoader.readServiceDirectory(
      absolutePath,
    );
    expect(serviceLoadable.directoryName).toBe("petstore");
    expect(serviceLoadable.serviceFiles).toHaveLength(1);

    const serviceFile = serviceLoadable.serviceFiles[0];
    expect(serviceFile.basename).toBe("index.yaml");
    expect(serviceFile.contents).toEqual(
      expect.stringContaining('openapi: "3.0.0"'),
    );
  });
});
