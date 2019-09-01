import unmock, { dsl } from "../";

describe("Top level export", () => {
  it("should export unmock object", () => {
    expect(unmock).toBeDefined();
    expect(unmock).toHaveProperty("on");
  });
  it("should export what unmock-core exports", () => {
    expect(dsl).toBeDefined();
  });
});
