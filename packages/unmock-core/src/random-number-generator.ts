import * as seedRandom from "seedrandom";
export const DEFAULT_SEED = 0;

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
}

const createSeedRandom = (seed?: number): seedrandom.prng => {
  return seedRandom((seed && seed.toString()) || DEFAULT_SEED.toString());
};

/**
 * Create an RNG using `seedrandom`.
 * @param seed Optional seed
 */
export const randomNumberGenerator = ({
  seed,
}: {
  seed?: number;
}): IRandomNumberGenerator => {
  let rng = createSeedRandom(seed);

  return {
    get() {
      return rng();
    },
    setSeed(newSeed: number) {
      rng = createSeedRandom(newSeed);
      return this;
    },
  };
};
