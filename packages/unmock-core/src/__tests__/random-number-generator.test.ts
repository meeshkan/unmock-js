import { randomNumberGenerator } from "../random-number-generator";

describe("Random number generator", () => {
  it("should create stream of numbers", () => {
    const rng = randomNumberGenerator({});
    const n1 = rng.get();
    expect(typeof n1).toBe("number");
    const n2 = rng.get();
    expect(n1).not.toEqual(n2);
  });
  it("should create the same number after setting seed", () => {
    const rng = randomNumberGenerator({ seed: 0 });
    const n1 = rng.get();
    rng.setSeed(0);
    const n2 = rng.get();
    expect(n1).toEqual(n2);
  });
});
