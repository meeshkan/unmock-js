import defProvider from "../service/state/providers";

describe("Test default provider", () => {
  it("returns empty objects for undefined state", () => {
    const p = defProvider();
    expect(p.isEmpty).toBeTruthy();
    expect(p.top).toEqual({});
    expect(p.gen({})).toEqual({});
  });

  it("returns empty objects for empty state", () => {
    const p = defProvider({});
    expect(p.isEmpty).toBeTruthy();
    expect(p.top).toEqual({});
    expect(p.gen({})).toEqual({});
  });

  it("filters out top level DSL from state", () => {
    const p = defProvider({ $code: 200, foo: "bar" });
    expect(p.isEmpty).toBeFalsy();
    expect(p.top).toEqual({ $code: 200 });
    expect(p.gen({})).toEqual({}); // no schema to expand
    expect(p.gen({ properties: { foo: { type: "string" } } })).toEqual({
      properties: {
        foo: "bar",
      },
    });
  });
});
