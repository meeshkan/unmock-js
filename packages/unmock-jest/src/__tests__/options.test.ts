import { DEFAULT_OUTPUT_DIRECTORY, resolveOptions } from "../reporter/options";

describe("Reporter options", () => {
  it("should resolve to default output directory when no output directory specified", () => {
    const resolvedOptions = resolveOptions({});
    expect(resolvedOptions).toHaveProperty(
      "outputDirectory",
      DEFAULT_OUTPUT_DIRECTORY,
    );
  });
});
