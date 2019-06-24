import path from "path";
import {
  FileSystemServiceDiscoverer,
  IService,
} from "../../services/file-system-discovery";

const RESOURCES_DIR = path.join(__dirname, "resources");

describe("File system service discoverer", () => {
  it("discovers from existing directory", async () => {
    const discoverer = new FileSystemServiceDiscoverer({
      servicesDir: RESOURCES_DIR,
    });
    const services: IService = await discoverer.services();
    expect(services).toHaveLength(0);
  });

  it("throws for a non-existing directory", async () => {
    const discoverer = new FileSystemServiceDiscoverer({
      servicesDir: "DEFINITELY_DOES_NOT_EXIST_I_HOPE",
    });
    try {
      await discoverer.services();
    } catch (e) {
      expect(/does not exist/.test(e.message)).toBe(true);
      return;
    }
    throw new Error("Should not get here");
  });
});
