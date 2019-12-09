import unmock from "../../browser";

describe("Top level export", () => {
  it("should export unmock object", () => {
    expect(unmock).toBeDefined();
    expect(unmock).toHaveProperty("on");
  });
});
