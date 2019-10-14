import unmock from "../node";

describe("Top level export", () => {
  it("should export unmock object", () => {
    expect(unmock).toBeDefined();
    expect(unmock).toHaveProperty("on");
  });
});
