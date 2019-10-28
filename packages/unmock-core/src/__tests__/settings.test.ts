import { BooleanSetting } from "../settings";

describe("Boolean setting", () => {
  it("should be false by default", () => {
    const booleanSetting = new BooleanSetting();
    expect(booleanSetting.get()).toBe(false);
  });
  it("should be true after setting to true", () => {
    const booleanSetting = new BooleanSetting();
    booleanSetting.on();
    expect(booleanSetting.get()).toBe(true);
  });
});
