import { describe, it, expect } from "vitest";
import {
  calculateLogisticPsychometric,
  UserLogMARGuessingEngine,
  calculateAlphaLikelihoods,
  proposeNextTrialLogMARThousandths,
} from "./UserLogMARGuessingEngine";
import { calculateShannonEntropy } from "./UserLogMARGuessingEngine";

describe("calculateShannonEntropy", () => {
  it("returns 0 for a certain outcome", () => {
    expect(calculateShannonEntropy([1, 0, 0, 0])).toBeCloseTo(0, 8);
    expect(calculateShannonEntropy([0, 1, 0, 0])).toBeCloseTo(0, 8);
  });

  it("returns 1 for a uniform binary distribution", () => {
    expect(calculateShannonEntropy([0.5, 0.5])).toBeCloseTo(0.6931, 4); // ln(2) = 0.6931
  });

  it("returns ln(4) for a uniform quaternary distribution", () => {
    expect(calculateShannonEntropy([0.25, 0.25, 0.25, 0.25])).toBeCloseTo(1.3863, 4); // ln(4) = 1.3863
  });

  it("returns a value between 0 and max for a non-uniform distribution", () => {
    const h = calculateShannonEntropy([0.8, 0.2]);
    expect(h).toBeGreaterThan(0);
    expect(h).toBeLessThan(0.6932); // ln(2)
  });
});

describe("calculateLogisticPsychometric", () => {
  it("should have probability 0.5 at alpha when gamma=0 and lambda=0", () => {
    // This tests the core property of the psychometric function
    // P(correct) = 0.5 when logMAR = alpha
    const result = calculateLogisticPsychometric(0.25, 0.25, 1.0, 0.0, 0.0);
    expect(result).toBe(0.5);
  });

  it("should have probability approaching gamma as logMAR approaches negative infinity", () => {
    // For very small letters (large negative logMAR), probability should approach gamma
    const gamma = 0.2;
    const result = calculateLogisticPsychometric(-20.0, 0.25, 1.0, gamma, 0.0);
    expect(result).toBeCloseTo(gamma);
  });

  it("should have probability approaching (1-lambda) as logMAR approaches positive infinity", () => {
    // For very small letters (large negative logMAR), probability should approach gamma
    const lambda = 0.02;
    const result = calculateLogisticPsychometric(20.0, 0.25, 1.0, 0.0, lambda);
    expect(result).toBeCloseTo(1 - lambda);
  });

  it("real-world case at alpha", () => {
    const logMAR = 0.0;
    const alpha = 0.0;
    const beta = 1.0;
    const gamma = 0.1;
    const lambda = 0.02;
    const result = calculateLogisticPsychometric(logMAR, alpha, beta, gamma, lambda);
    expect(result).toBeCloseTo(0.54);
  });

  it("real-world case away from alpha", () => {
    const logMAR = 0.1;
    const alpha = 0.0;
    const beta = 1.0;
    const gamma = 0.1;
    const lambda = 0.02;
    const result = calculateLogisticPsychometric(logMAR, alpha, beta, gamma, lambda);
    expect(result).toBeCloseTo(0.56);
  });
});

describe("calculateAlphaLikelihoods", () => {
  it("redistributes likelihoods downwards when the user gets it correct", () => {
    const alphas = [100, 200, 300];
    const priors = [0.2, 0.5, 0.3];
    const beta = 1000; // very steep, but not infinite
    const gamma = 0;
    const lambda = 0;
    const tested = 200;
    const gotCorrect = true;
    const post = calculateAlphaLikelihoods(tested, gotCorrect, alphas, priors, beta, gamma, lambda);
    expect(post[0]).toBeCloseTo(0.2);
    expect(post[1]).toBeCloseTo(0.25);
    expect(post[2]).toBeCloseTo(0.0);
  });

  it("relative likelihoods unchanged if psychometric is 0.5 everywhere", () => {
    const alphas = [100, 200, 300];
    const priors = [0.2, 0.5, 0.3];
    const beta = 0;
    const gamma = 0;
    const lambda = 0;
    const tested = 150;
    const gotCorrect = true;
    const post = calculateAlphaLikelihoods(tested, gotCorrect, alphas, priors, beta, gamma, lambda);
    expect(post[0]).toBeCloseTo(0.1);
    expect(post[1]).toBeCloseTo(0.25);
    expect(post[2]).toBeCloseTo(0.15);
  });

  it("relative likelihoods unchanged if psychometric is 0.5 everywhere and gotCorrect is false", () => {
    const alphas = [100, 200, 300];
    const priors = [0.2, 0.5, 0.3];
    const beta = 0;
    const gamma = 0;
    const lambda = 0;
    const tested = 150;
    const gotCorrect = false;
    const post = calculateAlphaLikelihoods(tested, gotCorrect, alphas, priors, beta, gamma, lambda);
    expect(post[0]).toBeCloseTo(0.1);
    expect(post[1]).toBeCloseTo(0.25);
    expect(post[2]).toBeCloseTo(0.15);
  });

  it("real-world case", () => {
    const alpha = [0, 100, 200, 300, 400];
    const priors = [0.2, 0.2, 0.2, 0.2, 0.2];
    const beta = 0.0125;
    const gamma = 0.125;
    const lambda = 0.01;
    const tested = 100;
    const gotCorrect = true;
    const actualPosteriors = calculateAlphaLikelihoods(
      tested,
      gotCorrect,
      alpha,
      priors,
      beta,
      gamma,
      lambda
    );

    // =============== BY-HAND CALCULATIONS ===================
    // 0.0 likelihood = 0.7973643799161078
    // 0.1 likelihood = 0.5575
    // 0.2 likelihood = 0.3176356200838921
    // 0.3 likelihood = 0.19061732571837567
    // 0.4 likelihood = 0.14487542497217215

    // RELATIVE LIKELIHOODS:
    // 0.0 likelihood = 0.159472876
    // 0.1 likelihood = 0.1115
    // 0.2 likelihood = 0.063527124
    // 0.3 likelihood = 0.0381234651
    // 0.4 likelihood = 0.028975085

    const expectedPosteriors = [0.159472876, 0.1115, 0.063527124, 0.0381234651, 0.028975085];

    for (const [idx, actualProbability] of actualPosteriors.entries()) {
      const expectedProbability = expectedPosteriors[idx];
      expect(actualProbability).toBeCloseTo(expectedProbability);
    }
  });
});

describe("proposeNextTrialLogMARThousandths", () => {
  it("calculates correctly in sample case 1", () => {
    const alphas = [-100, 100];
    const priors = [0.5, 0.5];
    const beta = 0.0125;
    const gamma = 0.125;
    const lambda = 0.02;
    const result = proposeNextTrialLogMARThousandths(alphas, priors, beta, gamma, lambda);
    expect(result).toBeCloseTo(100);
  });

  it("calculates correctly in heavy-centered priors", () => {
    const alphas = [-100, 0, 100];
    const priors = [0.2, 0.6, 0.2];
    const beta = 0.0125;
    const gamma = 0.125;
    const lambda = 0.02;
    const result = proposeNextTrialLogMARThousandths(alphas, priors, beta, gamma, lambda);
    expect(result).toBeCloseTo(0);
  });

  it("calculates correctly in left-skewed priors", () => {
    const alphas = [-300, -200, -100];
    const priors = [0.4, 0.4, 0.2];
    const beta = 0.0125;
    const gamma = 0.125;
    const lambda = 0.02;
    const result = proposeNextTrialLogMARThousandths(alphas, priors, beta, gamma, lambda);
    expect(result).toBeCloseTo(-200);
  });
});

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
    it("sample case 1", () => {
      const priors = new Map<number, number>([
        [-0.1, 0.5],
        [0.1, 0.5],
      ]);

      const engine = new UserLogMARGuessingEngine(priors, 8, 0.95);

      const proposal = engine.proposeNextTrialLogMAR();

      expect(proposal).toBe(0.2);
    });

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
