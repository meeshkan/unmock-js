import path from "path";
import {
  FileSystemServiceLoader,
  IService,
} from "../../loaders/file-system-service-loader";

const RESOURCES_DIR = path.join(__dirname, "resources");

describe("File system service loader", () => {
  it("discovers from existing directory", async () => {
    const discoverer = new FileSystemServiceLoader({
      servicesDir: RESOURCES_DIR,
    });
    const services: IService = await discoverer.load();
    expect(services).toHaveLength(1);
    const service = services[0];
    expect(service.name).toBe("petstore");
  });

  it("throws for a non-existing directory", async () => {
    const discoverer = new FileSystemServiceLoader({
      servicesDir: "DEFINITELY_DOES_NOT_EXIST_I_HOPE",
    });
    try {
      await discoverer.load();
    } catch (e) {
      expect(/does not exist/.test(e.message)).toBe(true);
      return;
    }
    throw new Error("Should not get here");
  });

  it("load serviceLoadables from existing directory", () => {
    const absolutePath = path.join(RESOURCES_DIR, "petstore");
    const serviceLoadable = FileSystemServiceLoader.readServiceDirectory(
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
