import { AllowedHosts, BooleanSetting } from "../settings";

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

describe("Allowed hosts list", () => {
  it("should include localhost", () => {
    const allowedHosts = new AllowedHosts();
    expect(allowedHosts.isWhitelisted("localhost")).toBe(true);
  });
  it("should add given URL", () => {
    const allowedHosts = new AllowedHosts();
    allowedHosts.add("unmock.io");
    expect(allowedHosts.isWhitelisted("unmock.io")).toBe(true);
  });
  it("should add URL with regex", () => {
    const allowedHosts = new AllowedHosts();
    allowedHosts.add(/unmock/);
    expect(allowedHosts.isWhitelisted("unmock.io")).toBe(true);
  });
});
