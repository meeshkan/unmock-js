import { DEFAULT_OUTPUT_DIRECTORY, resolveOptions } from "../reporter/options";

describe("Reporter options", () => {
  it("should resolve to default output directory when no output directory specified", () => {
    const resolvedOptions = resolveOptions({});
    expect(resolvedOptions).toHaveProperty(
      "outputDirectory",
      DEFAULT_OUTPUT_DIRECTORY
    );
  });
  it("should resolve to given output directory", () => {
    const outputDirectory = "some/dir";
    const resolvedOptions = resolveOptions({ outputDirectory });
    expect(resolvedOptions).toHaveProperty("outputDirectory", outputDirectory);
  });
});
