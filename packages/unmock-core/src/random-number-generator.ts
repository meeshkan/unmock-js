import * as seedRandom from "seedrandom";

/**
 * Representation for random number generator with mutable state.
 */
export interface IRandomNumberGenerator {
  /**
   * Generate a new number, increment state
   */
  get(): number;
  /**
   * Set new state.
   * @param seed New seed
   */
  setSeed(seed: number): void;
  /**
   * Freeze generator. Always returns the same result.
   */
  freeze(): void;
  /**
   * Unfreeze generator.
   */
  unfreeze(): void;
}

const createSeedRandom = (seed?: number): seedrandom.prng => {
  return seedRandom((seed && seed.toString()) || "0", { state: true });
};

/**
 * Create an RNG using `seedrandom`.
 * @param seed Optional seed
 */
export const randomNumberGenerator = ({
  frozen,
  seed,
}: {
  frozen: boolean;
  seed?: number;
}): IRandomNumberGenerator => {
  let isFrozen = frozen;
  let rng = createSeedRandom(seed);

  return {
    get() {
      if (!isFrozen) {
        return rng();
      }
      const state = rng.state();
      const newNumber = rng();
      rng = seedRandom("", { state });
      return newNumber;
    },
    setSeed(newSeed: number) {
      rng = createSeedRandom(newSeed);
      return this;
    },
    freeze() {
      isFrozen = true;
    },
    unfreeze() {
      isFrozen = false;
    },
  };
};
