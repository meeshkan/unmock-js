import { getAtLevel } from "../util";

describe("Tests getAtLevel", () => {
  const schema = {
    "/pets": {
      get: { "200": {}, default: {} },
      post: { "201": {}, default: {} },
    },
    "/pet/{petId}": { get: { "200": {}, default: {} } },
  };
  it("tests different levels without filter", () => {
    expect(getAtLevel(schema, 0).length).toBe(2); // Only 2 items at first level
    expect(getAtLevel(schema, 1).length).toBe(3); // 3 methods present
    expect(getAtLevel(schema, 2).length).toBe(6); // 6 matching response codes and defaults
    expect(getAtLevel(schema, 3).length).toBe(0); // Empty content
  });

  it("tests illogical levels without filter", () => {
    expect(() => getAtLevel(schema, -1)).toThrow("Not sure");
    expect(getAtLevel(schema, 100).length).toBe(0);
  });

  it("tests with invalid object", () => {
    expect(() => getAtLevel(undefined, 2)).toThrow("nestedObj");
    expect(() => getAtLevel({}, 2)).toThrow("nestedObj");
  });

  it("Tests with filters", () => {
    expect(
      getAtLevel(schema, 0, (k: string, _: any) => k === "/pets").length,
    ).toBe(1);
    expect(
      getAtLevel(schema, 1, (k: string, _: any) => k === "post").length,
    ).toBe(1);
    expect(
      getAtLevel(schema, 2, (k: string, _: any) => k === "200").length,
    ).toBe(2);
  });
});
