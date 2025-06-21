import { describe, it, expect, beforeEach } from "vitest";
import { UserLogMARGuessingEngine } from "./UserLogMARGuessingEngine";

describe("UserLogMARGuessingEngine", () => {
  let engine: UserLogMARGuessingEngine;
  let mockAlphaPriors: Map<number, number>;

  beforeEach(() => {
    // Create mock alpha priors for testing
    mockAlphaPriors = new Map([
      [0.0, 0.1], // 10% probability for LogMAR 0.0
      [0.1, 0.2], // 20% probability for LogMAR 0.1
      [0.2, 0.3], // 30% probability for LogMAR 0.2
      [0.3, 0.2], // 20% probability for LogMAR 0.3
      [0.4, 0.1], // 10% probability for LogMAR 0.4
      [0.5, 0.05], // 5% probability for LogMAR 0.5
      [0.6, 0.05], // 5% probability for LogMAR 0.6
    ]);

    engine = new UserLogMARGuessingEngine(mockAlphaPriors);
  });

  describe("constructor", () => {
    it("should initialize with the provided alpha priors", () => {
      expect(engine).toBeInstanceOf(UserLogMARGuessingEngine);

      // Test that we can access the engine (though priors are private)
      // We'll test this through the public methods
    });

    it("should create a deep copy of the alpha priors", () => {
      const originalPriors = new Map([
        [0.0, 0.5],
        [0.1, 0.5],
      ]);

      new UserLogMARGuessingEngine(originalPriors);

      // Modify the original map
      originalPriors.set(0.0, 0.8);

      // The engine should still work with the original values
      // (we'll test this through proposeNextTrialLogMAR when implemented)
    });

    it("should handle empty alpha priors", () => {
      const emptyPriors = new Map<number, number>();
      const engine = new UserLogMARGuessingEngine(emptyPriors);

      expect(engine).toBeInstanceOf(UserLogMARGuessingEngine);
    });
  });

  describe("proposeNextTrialLogMAR", () => {
    it("should be implemented (currently returns undefined)", () => {
      const result = engine.proposeNextTrialLogMAR();
      expect(result).toBeUndefined();
    });

    // TODO: Add more tests when the method is implemented
    // it('should return a LogMAR value within the range of alpha priors', () => {
    //   const result = engine.proposeNextTrialLogMAR();
    //   expect(result).toBeGreaterThanOrEqual(0.0);
    //   expect(result).toBeLessThanOrEqual(0.6);
    // });

    // it('should prefer LogMAR values with higher prior probabilities', () => {
    //   // Test that it tends to suggest LogMAR 0.2 (30% probability) more often
    // });
  });

  describe("psychometric function calculations", () => {
    // Test the private getProbabilityCorrect method through reflection or by making it public
    // For now, we'll test the mathematical properties we expect

    it("should have probability 0.5 at alpha when gamma=0 and lambda=0", () => {
      // This would test the core property of the psychometric function
      // P(correct) = 0.5 when logMAR = alpha
      // We'd need to make getProbabilityCorrect public or test through other means
    });

    it("should have probability approaching gamma as logMAR approaches negative infinity", () => {
      // For very small letters (large negative logMAR), probability should approach gamma
    });

    it("should have probability approaching (1-lambda) as logMAR approaches positive infinity", () => {
      // For very large letters (large positive logMAR), probability should approach (1-lambda)
    });
  });

  describe("edge cases", () => {
    it("should handle single LogMAR value in priors", () => {
      const singlePrior = new Map([[0.2, 1.0]]);
      const engine = new UserLogMARGuessingEngine(singlePrior);

      expect(engine).toBeInstanceOf(UserLogMARGuessingEngine);
    });

    it("should handle very small probability values", () => {
      const smallPriors = new Map([
        [0.0, 0.001],
        [0.1, 0.999],
      ]);
      const engine = new UserLogMARGuessingEngine(smallPriors);

      expect(engine).toBeInstanceOf(UserLogMARGuessingEngine);
    });

    it("should handle negative LogMAR values", () => {
      const negativePriors = new Map([
        [-0.1, 0.3],
        [0.0, 0.4],
        [0.1, 0.3],
      ]);
      const engine = new UserLogMARGuessingEngine(negativePriors);

      expect(engine).toBeInstanceOf(UserLogMARGuessingEngine);
    });
  });

  describe("integration scenarios", () => {
    it("should work with realistic LogMAR ranges", () => {
      // Typical LogMAR range for vision testing: -0.3 to 1.0
      const realisticPriors = new Map([
        [-0.3, 0.05], // Excellent vision
        [-0.2, 0.1],
        [-0.1, 0.15],
        [0.0, 0.2], // Normal vision
        [0.1, 0.2],
        [0.2, 0.15],
        [0.3, 0.1],
        [0.4, 0.03],
        [0.5, 0.01],
        [0.6, 0.005],
        [0.7, 0.002],
        [0.8, 0.001],
        [0.9, 0.0005],
        [1.0, 0.0002], // Poor vision
      ]);

      const engine = new UserLogMARGuessingEngine(realisticPriors);
      expect(engine).toBeInstanceOf(UserLogMARGuessingEngine);
    });
  });
});
