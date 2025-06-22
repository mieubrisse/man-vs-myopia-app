import { describe, it, expect } from "vitest";
import { UserLogMARGuessingEngine } from "./UserLogMARGuessingEngine";

describe("UserLogMARGuessingEngine", () => {
  describe("constructor", () => {
    it("should throw an error on alpha LogMAR values higher than the supported resolution", () => {
      expect(
        () =>
          new UserLogMARGuessingEngine(
            new Map([
              [0.0005, 0.3],
              [0.001, 0.3],
              [0.0015, 0.4],
            ]),
            10,
            0.95
          )
      ).toThrowError("LogMAR precision");
    });

    it("should throw an error on alpha probability that doesn't sum to one", () => {
      expect(
        () =>
          new UserLogMARGuessingEngine(
            new Map([
              [0.1, 0.3],
              [0.2, 0.3],
              [0.3, 0.2],
            ]),
            10,
            0.95
          )
      ).toThrowError("Total alpha probability must == 1.0");
    });

    it("should handle slight floating-point deviations gracefully", () => {
      new UserLogMARGuessingEngine(
        new Map([
          [0.1, 0.7],
          [0.2, 0.3],
        ]),
        10,
        0.95
      );
    });

    it("should throw on non-even gaps in the alpha priors grid", () => {
      expect(
        () =>
          new UserLogMARGuessingEngine(
            new Map([
              [0.0, 0.3],
              [0.1, 0.3],
              [0.3, 0.4],
            ]),
            10,
            0.95
          )
      ).toThrowError();
    });

    it("should throw on < 2 alpha priors", () => {
      expect(() => new UserLogMARGuessingEngine(new Map([[0.0, 0.3]]), 10, 0.95)).toThrowError();
    });

    it("should throw on non-(0.0,0.1) confidence interval", () => {
      const alphaPriors = new Map([
        [0.0, 0.3],
        [0.1, 0.3],
        [0.2, 0.4],
      ]);

      // 0.0 confidence should fail
      expect(() => new UserLogMARGuessingEngine(alphaPriors, 10, 0.0)).toThrowError();

      // As should 1.0
      expect(() => new UserLogMARGuessingEngine(alphaPriors, 10, 1.0)).toThrowError();

      // As should negative numbers
      expect(() => new UserLogMARGuessingEngine(alphaPriors, 10, -0.2)).toThrowError();

      // As should positive numbers beyond 1
      expect(() => new UserLogMARGuessingEngine(alphaPriors, 10, 1.1)).toThrowError();
    });

    it("should throw on non-positive-integer number of optotypes", () => {
      const alphaPriors = new Map([
        [0.0, 0.3],
        [0.1, 0.3],
        [0.2, 0.4],
      ]);

      // 0 optotypes should fail
      expect(() => new UserLogMARGuessingEngine(alphaPriors, 0, 0.5)).toThrowError();

      // As should negative
      expect(() => new UserLogMARGuessingEngine(alphaPriors, -2, 0.5)).toThrowError();

      // As should decimals
      expect(() => new UserLogMARGuessingEngine(alphaPriors, 1.5, 0.5)).toThrowError();
    });

    it("should create a deep copy of the alpha priors", () => {
      const originalPriors = new Map([
        [0.0, 0.5],
        [0.1, 0.5],
      ]);

      const engine = new UserLogMARGuessingEngine(originalPriors, 5, 0.95);

      // Modify the original map
      originalPriors.set(0.0, 0.8);

      const enginePriors = engine.getAlphaProbabilities();

      expect(enginePriors.get(0.0)).toBe(0.5);
    });
  });

  describe("proposeNextTrialLogMAR", () => {
    it("proposes with a flat probability distribution (necessary when evaluating a new user)", () => {
      const priors = new Map<number, number>([
        [0.0, 0.2],
        [0.1, 0.2],
        [0.2, 0.2],
        [0.3, 0.2],
        [0.4, 0.2],
      ]);

      const engine = new UserLogMARGuessingEngine(priors, 10, 0.95);

      const proposal = engine.proposeNextTrialLogMAR();

      expect(proposal).toBe(0.2);
    });

    it("proposes with an uneven distribution (necessary when evaluating a user who's been evaluated previously)", () => {
      const priors = new Map<number, number>([
        [0.0, 0.05],
        [0.1, 0.1],
        [0.2, 0.4],
        [0.3, 0.3],
        [0.4, 0.15],
      ]);

      const engine = new UserLogMARGuessingEngine(priors, 10, 0.95);

      const proposal = engine.proposeNextTrialLogMAR();

      expect(proposal).toBeCloseTo(0.24);
    });
  });

  describe("updateGivenTrialResult", () => {
    it("should update correctly after a trial", () => {
      const priors = new Map<number, number>([
        [0.0, 0.2],
        [0.1, 0.2],
        [0.2, 0.2],
        [0.3, 0.2],
        [0.4, 0.2],
      ]);

      const engine = new UserLogMARGuessingEngine(priors, 10, 0.95);
      engine.updateGivenTrialResult(0.1, true);

      // =============== BY-HAND CALCULATIONS ===================
      // ALPHAS (NOTE: assumes lambda == 0.01, which is hardcoded at time of test writing)
      // 0.0 likelihood = 0.791796876445475
      // 0.1 likelihood = 0.545
      // 0.2 likelihood = 0.2982031235545249
      // 0.3 likelihood = 0.16751378021890678
      // 0.4 likelihood = 0.1204498592199228

      // RELATIVE BELIEFS:
      // 0.0 likelihood = 0.1583593753
      // 0.1 likelihood = 0.109
      // 0.2 likelihood = 0.0596406247
      // 0.3 likelihood = 0.033502756
      // 0.4 likelihood = 0.0240899718

      // NORMALIZED POSTERIORS:
      // 0.0 likelihood = 0.4117586315
      // 0.1 likelihood = 0.2834166954
      // 0.2 likelihood = 0.1550747593
      // 0.3 likelihood = 0.0871122972
      // 0.4 likelihood = 0.0626376165

      const expectedPosteriors = new Map<number, number>([
        [0.0, 0.4117586315],
        [0.1, 0.2834166954],
        [0.2, 0.1550747593],
        [0.3, 0.0871122972],
        [0.4, 0.0626376165],
      ]);

      const actualPosteriors = engine.getAlphaProbabilities();

      for (const [logMAR, expectedProbability] of expectedPosteriors.entries()) {
        const actualProbability = actualPosteriors.get(logMAR);
        expect(actualProbability).toBeCloseTo(expectedProbability);
      }
    });
  });

  describe("calculateLogisticPsychometric", () => {
    it("should have probability 0.5 at alpha when gamma=0 and lambda=0", () => {
      // This tests the core property of the psychometric function
      // P(correct) = 0.5 when logMAR = alpha
      const result = UserLogMARGuessingEngine.calculateLogisticPsychometric(
        0.25,
        0.25,
        1.0,
        0.0,
        0.0
      );
      expect(result).toBe(0.5);
    });

    it("should have probability approaching gamma as logMAR approaches negative infinity", () => {
      // For very small letters (large negative logMAR), probability should approach gamma
      const gamma = 0.2;
      const result = UserLogMARGuessingEngine.calculateLogisticPsychometric(
        -20.0,
        0.25,
        1.0,
        gamma,
        0.0
      );
      expect(result).toBeCloseTo(gamma);
    });

    it("should have probability approaching (1-lambda) as logMAR approaches positive infinity", () => {
      // For very small letters (large negative logMAR), probability should approach gamma
      const lambda = 0.02;
      const result = UserLogMARGuessingEngine.calculateLogisticPsychometric(
        20.0,
        0.25,
        1.0,
        0.0,
        lambda
      );
      expect(result).toBeCloseTo(1 - lambda);
    });

    it("real-world case at alpha", () => {
      const logMAR = 0.0;
      const alpha = 0.0;
      const beta = 1.0;
      const gamma = 0.1;
      const lambda = 0.02;
      const result = UserLogMARGuessingEngine.calculateLogisticPsychometric(
        logMAR,
        alpha,
        beta,
        gamma,
        lambda
      );
      expect(result).toBeCloseTo(0.54);
    });

    it("real-world case away from alpha", () => {
      const logMAR = 0.1;
      const alpha = 0.0;
      const beta = 1.0;
      const gamma = 0.1;
      const lambda = 0.02;
      const result = UserLogMARGuessingEngine.calculateLogisticPsychometric(
        logMAR,
        alpha,
        beta,
        gamma,
        lambda
      );
      expect(result).toBeCloseTo(0.56);
    });
  });

  describe("getConfidenceIntervalBoundInBucket", () => {
    it("should throw if the confidence interval bound was crossed in a previous bucket", () => {
      expect(() =>
        UserLogMARGuessingEngine.getConfidenceIntervalBoundInBucket(0.5, 1.0, 0.1, 0.1, 0.4)
      ).toThrowError();
    });

    it("should return undefined if the confidence interval isn't crossed in this bucket", () => {
      const result = UserLogMARGuessingEngine.getConfidenceIntervalBoundInBucket(
        0.5,
        1.0,
        0.1,
        0.1,
        0.9
      );
      expect(result).toBeUndefined();
    });

    it("should correctly calculate the bound within the bucket", () => {
      const bound = UserLogMARGuessingEngine.getConfidenceIntervalBoundInBucket(
        0.5,
        0.1,
        0.5,
        0.1,
        0.75
      );
      expect(bound).toBe(0.1);
    });
  });

  describe("End-to-end tests", () => {
    it("verifies the confidence interval after getting two symbols right at 0.4 logMAR", () => {
      const alphaPriors = new Map<number, number>();
      const minLogMAR = -0.3;
      const maxLogMAR = 1.2;
      const step = 0.01;

      // A uniform prior
      let totalEntries = 0;
      for (let logMAR = minLogMAR; logMAR <= maxLogMAR; logMAR += step) {
        totalEntries++;
      }
      const probability = 1 / totalEntries;

      for (let logMAR = minLogMAR; logMAR <= maxLogMAR; logMAR += step) {
        // Round to avoid floating point issues
        const roundedLogMAR = Math.round(logMAR * 1000) / 1000;
        alphaPriors.set(roundedLogMAR, probability);
      }

      const numDistinctOptotypes = 8; // Landolt C has 8 orientations
      const confidenceInterval = 0.95; // 95% confidence

      const engine = new UserLogMARGuessingEngine(
        alphaPriors,
        numDistinctOptotypes,
        confidenceInterval
      );

      engine.updateGivenTrialResult(0.4, true);
      engine.updateGivenTrialResult(0.4, true);

      const result = engine.guessUserLogMAR();

      expect(result.guessedLogMAR).toBeCloseTo(0.045, 4);
      expect(result.intervalLowerBound).toBeCloseTo(-0.2885797, 4);
      expect(result.intervalUpperBound).toBeCloseTo(0.5092688, 4);
    });
  });
});
