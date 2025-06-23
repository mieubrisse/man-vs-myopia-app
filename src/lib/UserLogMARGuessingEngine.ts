// The smallest resolution of a logMAR that we'll...
// - Allow the user to enter

// - Output, for proposing logMAR sizes
const MAXIMUM_LOGMAR_PRECISION: number = 1000;

function normalizeVector(vector: number[]): number[] {
  const sum = vector.reduce((prevVal, curr) => prevVal + curr, 0);

  return vector.map((val) => val / sum);
}

// See https://en.wikipedia.org/wiki/Entropy_(information_theory)
export function calculateShannonEntropy(probabilities: number[]): number {
  const totalEntropy = probabilities.reduce((totalEntropy, probability) => {
    let entropy = 0;
    if (probability !== 0) {
      entropy = probability * Math.log(probability);
    }
    return totalEntropy - entropy;
  }, 0);

  return totalEntropy;
}

/**
 * Calculates a value using the logistic psychometric function: https://en.wikipedia.org/wiki/Logistic_function
 *
 * @param givenLogMAR The LogMAR value for which to calculate the probability, given the following logistic psychometric parameters.
 *
 * @param alpha The alpha parameter of the logistic psychometric function - the LogMAR value at which the user's probability
 * to correctly identify the letter is 50%.
 *
 * @param beta The beta parameter of the logistic psychometric function - the slope around the alpha value indicating
 * how quickly the user becomes able to identify the latter as font size (LogMAR) gets bigger.
 *
 * @param gamma The gamma parameter of the logistic psychometric function - the chance that the user will get the
 * letter right purely by guessing.
 *
 * @param lambda The lambda param of the logistic psychometric function - the chance that the user will err a letter
 * purely due to human error (even though it's well within their viewing ability).
 *
 * @returns The probability [0,1] that the user will correctly identify the letter at the given logMAR for
 * the logistic psychometric distribution characterized by the given parameters.
 */
export function calculateLogisticPsychometric(
  givenLogMAR: number,
  alpha: number,
  beta: number,
  gamma: number,
  lambda: number
): number {
  return gamma + (1 - lambda - gamma) / (1 + Math.exp(-beta * (givenLogMAR - alpha)));
}

/**
 * Updates the probabilities of any given alpha being the true alpha given the user's performance
 * on a letter identification task.
 *
 * @param testedLogMARThousandths The LogMAR value (in thousandths) of the symbol the user read (also known as tau, 𝝉)
 * @param gotCorrect Whether the user correctly identified the letter
 * @param allAlphaLogMARThousandths A vector of all the LogMAR thousandths of each alpha
 * @param alphaPriors The probability that any given alpha is correct (prior)
 * @param betaLogMARThousandths Psychometric beta, in thousands of LogMAR
 * @param gamma Psychometric gamma (guess rate)
 * @param lambda Psychometric lambda (guess rate)
 * @returns A vector of the posterior probabilities for each alpha
 */
export function calculateAlphaLikelihoods(
  testedLogMARThousandths: number,
  gotCorrect: boolean,
  allAlphaLogMARThousandths: number[],
  alphaPriors: number[],
  betaLogMARThousandths: number,
  gamma: number,
  lambda: number
): number[] {
  const alphaLikelihoods = new Array<number>();

  // To update our priors, we:
  // 1. Iterate over each alpha in the priors grid, and calculate Ψ(alpha, logMARTested) to see what the psychometric
  //  function has to say about the likelihood of the user getting it right.
  // 2. Compare what that alpha says about the likelihood of getting it right vs whether the user actually got it right
  // 3. Update the likelihood of that alpha based on how close/far the Ψ(alpha, logMARTested) was to the user's actual result
  for (const [idx, alphaLogMARThousandths] of allAlphaLogMARThousandths.entries()) {
    const alphaProbability = alphaPriors[idx];

    // This is the likelihood of the user getting it correct at the given alpha & tested LogMAR size
    const probUserCorrectAtAlpha = calculateLogisticPsychometric(
      testedLogMARThousandths,
      alphaLogMARThousandths,
      betaLogMARThousandths,
      gamma,
      lambda
    );

    const likelihood = gotCorrect ? probUserCorrectAtAlpha : 1 - probUserCorrectAtAlpha;

    // Each alpha gets adjusted based on how confidently it stated that the user's guess would match what the user actually did
    // For example:
    // - Alphas that confidently state the user will get it right and are correct are adjusted up a lot
    // - Alphas that confidently state the user will get it right and are wrong are adjusted down a lot
    alphaLikelihoods.push(likelihood * alphaProbability);
  }
  return alphaLikelihoods;
}

export function proposeNextTrialLogMARThousandths(
  alphaLogMARThousandths: number[],
  alphaPriors: number[],
  betaLogMARThousandths: number,
  gamma: number,
  lambda: number
): number {
  let bestLogMARThousandths: number = alphaLogMARThousandths[0];
  let minimumEntropy = Infinity;

  // Here we iterate through all possible LogMAR values (𝝉), calculating the alpha posteriors in
  // the cases where the user gets it right and wrong
  // We then calculate the Shannon entropy of those posteriors, so we can choose the LogMAR value
  // that minimizes entropy
  for (const testLogMARThousandths of alphaLogMARThousandths) {
    let entropyForTestLogMARThousandths = 0;
    for (const gotCorrect of [true, false]) {
      const likelihoods = calculateAlphaLikelihoods(
        testLogMARThousandths,
        gotCorrect,
        alphaLogMARThousandths,
        alphaPriors,
        betaLogMARThousandths,
        gamma,
        lambda
      );
      const posteriors = normalizeVector(likelihoods);
      const entropyForGivenResult = calculateShannonEntropy(posteriors);

      // This is the total probability that the user will get the specified true/false value
      // given our alpha priors
      // Put another way: P(user_result_for_test_logmar|alpha_priors)
      const likelihoodSum = likelihoods.reduce((sum, likelihood) => sum + likelihood, 0);

      entropyForTestLogMARThousandths += likelihoodSum * entropyForGivenResult;
    }

    if (entropyForTestLogMARThousandths < minimumEntropy) {
      bestLogMARThousandths = testLogMARThousandths;
      minimumEntropy = entropyForTestLogMARThousandths;
    }
  }
  return bestLogMARThousandths;
}

/**
 * This class takes a very well-informed guess at what the user's LogMAR prescription is based on
 * their performance on the LogMAR chart.
 *
 * It does this by implementing the QUEST+ algorithm ( https://jov.arvojournals.org/article.aspx?doi=10.1167/17.3.10 )
 * for identifying the psychometric distribution corresponding to the user's results.
 *
 * You can think of it like a fancy form of linear regression:
 * "Given the user's results, which parameters define a psychometric function, Ψ ( https://en.wikipedia.org/wiki/Psychometric_function )
 * that most closely matches the user's results?""
 *
 * I'd like to thank ChatGPT for doing a GREAT job explaining this to me.
 */
// TODO Incorporate the Stanford Visual Acuity Test?? https://stanford.edu/~cpiech/bio/papers/StAT.pdf?utm_source=chatgpt.com
export class UserLogMARGuessingEngine {
  // This is the slope at alpha (the point where probability of the user's correct guess crosses 1.0)
  // ChatGPT says "High-contrast Sloan letters, fovea, adult observers → β ≈ 10 – 15 for the logistic form we've been using"
  // TODO Derive this value independently from user observation, preferably taking into account light/contrast levels as well
  /*
   This is important because according to ChatGPT:

   "Going from photopic high-contrast to mesopic or low-contrast letters reduces β by 25-50 %. Mesopic/low-contrast acuity papers consistently find gentler slopes"
   https://pubmed.ncbi.nlm.nih.gov/28211180/
   https://journals.lww.com/optvissci/abstract/2015/05000/determinants_and_standardization_of_mesopic_visual.8.aspx

   "Tumbling-E and Landolt-C are usually 10-20 % flatter than 10-AFC Sloan because of higher guess rate and stimulus confusions."

   https://www.researchgate.net/publication/12066925_The_Slope_of_the_Psychometric_Function_for_Bailey-Lovie_Letter_Charts_Defocus_Effects_and_Implications_for_Modeling_Letter-By-Letter_Scores
   */
  private static LOGISTIC_PSYCHOMETRIC_BETA_LOGMAR_THOUSANDTHS: number = 0.0125; // 12.5 converted for LogMAR thousandths

  // TODO maybe guess this dynamically???
  private static LOGISTIC_PSYCHOMETRIC_LAMBDA: number = 0.01; // Chose this number completely arbitrarily

  private alphaLogMARThousandths: number[];
  private alphaProbabilities: number[]; // The posterior
  // private alphaPriors: Map<number, number>; // Keys are THOUSANDTHS of LogMAR (to avoid floating-point silliness)
  private logMARGap: number;
  private numDistinctOptotypes: number;
  private confidenceInterval: number;
  // private psychometricCore: PsychometricCoreFunction;

  /**
   * Creates an engine for probabilitistically determining the user's LogMAR prescription.
   *
   * **NOTE:** The smallest LogMAR value that this engine will operate on is 0.001 LogMAR!
   *
   * @param alphaPriors A probability graph of LogMAR -> probability that
   * a psychometric function with an "alpha" parameter of that LogMAR value most
   * closely matches the user's data.
   *
   * Precisely, each entry is treated as a bucket with
   * the total probability evenly distributed across the bucket. The width of the bucket
   * will be alpha_logMAR_N+1 - alpha_logMAR_N.
   *
   * **NOTE:** The LogMAR values here must not exceed the maximum 0.001 LogMAR resolution.
   *
   * @param numDistinctOptotypes The number of possible optotypes that could be shown
   * to a user during any given trial (e.g. if we're using Sloan letters, that would be 10
   * because there are 10 Sloan letters).
   *
   * @param confidenceInterval The width of the confidence interval that will be returned upon a guess
   * of the user's LogMAR.
   */
  constructor(
    alphaPriors: Map<number, number>,
    numDistinctOptotypes: number,
    confidenceInterval: number
  ) {
    if (alphaPriors.size < 2) {
      throw new Error("Must have at least two alpha priors");
    }

    const alphaLogMARs: number[] = [...alphaPriors.keys()].sort((a, b) => a - b);
    const alphaLogMARThousandths = alphaLogMARs.map((alphaLogMAR) => {
      const logMARThousandths = Math.floor(alphaLogMAR * MAXIMUM_LOGMAR_PRECISION);
      if (logMARThousandths !== alphaLogMAR * MAXIMUM_LOGMAR_PRECISION) {
        throw new Error(
          `The maximum LogMAR precision supported by this engine is 1/${MAXIMUM_LOGMAR_PRECISION} LogMAR, ` +
            `but provided LogMAR value ${alphaLogMAR} has granularity finer than that`
        );
      }
      return logMARThousandths;
    });

    const alphaProbabilities: number[] = alphaLogMARs.map((alphaLogMAR) => {
      const alphaProbability = alphaPriors.get(alphaLogMAR);
      if (alphaProbability === undefined) {
        throw new Error(
          `No probability was defined for alpha LogMAR ${alphaLogMAR}; this should never happen`
        );
      }
      return alphaProbability;
    });

    const sumProbability = alphaProbabilities.reduce(
      (prevVal, probability) => prevVal + probability,
      0
    );

    /*
    const alphaPriorsLogMARThousandths = new Map<number, number>();
    let sumProbability = 0;
    for (const [alphaLogMAR, probability] of alphaPriors.entries()) {
      const logMARThousandths = Math.floor(alphaLogMAR * MAXIMUM_LOGMAR_PRECISION);
      if (logMARThousandths !== alphaLogMAR * MAXIMUM_LOGMAR_PRECISION) {
        throw new Error(
          `The maximum LogMAR precision supported by this engine is 1/${MAXIMUM_LOGMAR_PRECISION} LogMAR, ` +
            `but provided LogMAR value ${alphaLogMAR} has granularity finer than that`
        );
      }

      alphaPriorsLogMARThousandths.set(logMARThousandths, probability);
      sumProbability += probability;
    }
      */

    if (Math.abs(sumProbability - 1.0) > 1e-7) {
      throw new Error(`Total alpha probability must == 1.0 but is ${sumProbability}`);
    }

    /*
    // Verify that the alpha LogMAR values don't exceed our resolution and are equally-spaced, just to not be insane
    const sortedAlphaLogMARThousandths = [...alphaPriorsLogMARThousandths.keys()].sort(
      (a, b) => a - b
    );
    */

    const expectedLogMARGap = alphaLogMARThousandths[1] - alphaLogMARThousandths[0];
    for (const [idx, logMARThousandths] of alphaLogMARThousandths.entries()) {
      if (idx === 0) {
        continue;
      }
      const prevLogMARThousandths = alphaLogMARThousandths[idx - 1];
      const actualLogMARGap = logMARThousandths - prevLogMARThousandths;
      if (actualLogMARGap != expectedLogMARGap) {
        throw new Error(
          `The gap between alpha priors is inconsistent: expected ${
            expectedLogMARGap / MAXIMUM_LOGMAR_PRECISION
          } gap throughout, but ` +
            `found ${actualLogMARGap / MAXIMUM_LOGMAR_PRECISION} gap between ${
              logMARThousandths / MAXIMUM_LOGMAR_PRECISION
            } and ${prevLogMARThousandths / MAXIMUM_LOGMAR_PRECISION}`
        );
      }
    }

    if (confidenceInterval <= 0 || confidenceInterval >= 1.0) {
      throw new Error(`Confidence interval must be (0.0, 1.0) but was ${confidenceInterval}`);
    }

    if (numDistinctOptotypes <= 0) {
      throw new Error(`Number of distinct optotypes must be > 0 but was ${numDistinctOptotypes}`);
    }
    if (!Number.isInteger(numDistinctOptotypes)) {
      throw new Error(
        `Number of distinct optotypes must be an integer but was ${numDistinctOptotypes}`
      );
    }

    this.alphaLogMARThousandths = alphaLogMARThousandths;
    this.alphaProbabilities = alphaProbabilities;
    this.logMARGap = expectedLogMARGap;
    this.numDistinctOptotypes = numDistinctOptotypes;
    this.confidenceInterval = confidenceInterval;
    // this.psychometricCore = sigmoidFunction;
  }

  /**
   * Given the current priors in the engine (i.e. the current best guess about which psychometric function
   * most closely matches the results we've seen), have the engine propose the size of the next
   * letters to show to the user such that we maximize the information the engine gains from
   * the user getting tested against that line.
   */
  proposeNextTrialLogMAR(): number {
    const nextLogMARThousandths = proposeNextTrialLogMARThousandths(
      this.alphaLogMARThousandths,
      this.alphaProbabilities,
      UserLogMARGuessingEngine.LOGISTIC_PSYCHOMETRIC_BETA_LOGMAR_THOUSANDTHS,
      1 / this.numDistinctOptotypes,
      UserLogMARGuessingEngine.LOGISTIC_PSYCHOMETRIC_LAMBDA
    );

    return Math.floor(nextLogMARThousandths) / MAXIMUM_LOGMAR_PRECISION;
  }

  /**
   * Updates the engine with the result of a test.
   * @param logMARTested The size of the letter that was tested, in LogMAR. **NOTE:** Must not exceed thousandths of LogMAR!
   * @param gotCorrectResult Whether the user correctly ascertained the letter (either through guessing or actually identifying).
   */
  updateGivenTrialResult(logMARTested: number, gotCorrectResult: boolean) {
    const testedLogMARThousandths = Math.floor(logMARTested * MAXIMUM_LOGMAR_PRECISION);
    if (testedLogMARThousandths !== logMARTested * MAXIMUM_LOGMAR_PRECISION) {
      throw new Error(
        `Maximum LogMAR resolution is 1/${MAXIMUM_LOGMAR_PRECISION} but provided tested LogMAR ${logMARTested} exceeds this resolution`
      );
    }

    const alphaLikelihoods = calculateAlphaLikelihoods(
      logMARTested,
      gotCorrectResult,
      this.alphaLogMARThousandths,
      this.alphaProbabilities,
      UserLogMARGuessingEngine.LOGISTIC_PSYCHOMETRIC_BETA_LOGMAR_THOUSANDTHS,
      1 / this.numDistinctOptotypes,
      UserLogMARGuessingEngine.LOGISTIC_PSYCHOMETRIC_LAMBDA
    );

    // Normalize relative belief back into probabilities
    const alphaPosteriors = normalizeVector(alphaLikelihoods);

    // Now, use the posterior as the prior for our next trial
    this.alphaProbabilities = alphaPosteriors;
  }

  /**
   * Guesses the user's LogMAR based on the data the engine has seen so far.
   *
   * @returns A guess of the user's visual acuity, in LogMAR, with a confidence interval
   * of a width matching the interval that was passed in the constructor. The user's guess
   * will be the posterior mean (expected value), which [the QUEST+ paper says to be the
   * best choice for error minimization](https://jov.arvojournals.org/article.aspx?articleid=2611972#:~:text=subsequently%20showed%20through%20simulation%20that%20the%20mean%20of%20the%20density%20was%20a%20better%20choice).
   */
  guessUserLogMAR(): {
    guessedLogMAR: number;
    intervalLowerBound: number;
    intervalUpperBound: number;
  } {
    // Get the guessed LogMAR (which is the mean of the alpha probability distribution)
    let guessedLogMARThousandths: number = 0;
    for (const [idx, alphaLogMARThousandths] of this.alphaLogMARThousandths.entries()) {
      const alphaProbability = this.alphaProbabilities[idx];
      guessedLogMARThousandths += alphaLogMARThousandths * alphaProbability;
    }
    const guessedLogMAR = Math.round(guessedLogMARThousandths) / MAXIMUM_LOGMAR_PRECISION;

    const tailProbabilityMass = (1 - this.confidenceInterval) / 2;
    const lowerBoundProbabilityMass = tailProbabilityMass;
    const upperBoundProbabilityMass = 1 - tailProbabilityMass;

    // Find the lower & upper LogMAR values between which is >= CONFIDENCE_INTERVAL belief
    // We do this by building a stepwise probability density function, treating each alpha LogMAR's pointwise probability
    // as equally distributed across a bin of width logMARGap, and then summing the probability density function from
    // left to right
    let sumProbabilitySoFar = 0;
    let lowerBoundThousandths;
    let upperBoundThousandths;
    for (const [idx, alphaLogMARThousandths] of this.alphaLogMARThousandths.entries()) {
      const probabilityForAlpha = this.alphaProbabilities[idx];

      if (lowerBoundThousandths === undefined) {
        lowerBoundThousandths = UserLogMARGuessingEngine.getConfidenceIntervalBoundInBucket(
          sumProbabilitySoFar,
          alphaLogMARThousandths,
          probabilityForAlpha,
          this.logMARGap,
          lowerBoundProbabilityMass
        );
      }

      if (upperBoundThousandths === undefined) {
        upperBoundThousandths = UserLogMARGuessingEngine.getConfidenceIntervalBoundInBucket(
          sumProbabilitySoFar,
          alphaLogMARThousandths,
          probabilityForAlpha,
          this.logMARGap,
          upperBoundProbabilityMass
        );
      }

      sumProbabilitySoFar += probabilityForAlpha;
    }

    if (lowerBoundThousandths === undefined) {
      throw new Error(
        "Somehow we didn't find the confidence interval lower bound after iterating through the entire alpha probability distribution; this is a bug in the code"
      );
    }
    if (upperBoundThousandths === undefined) {
      throw new Error(
        "Somehow we didn't find the confidence interval upper bound after iterating through the entire alpha probability distribution; this is a bug in the code"
      );
    }

    return {
      guessedLogMAR: guessedLogMAR,
      intervalLowerBound: lowerBoundThousandths / MAXIMUM_LOGMAR_PRECISION,
      intervalUpperBound: upperBoundThousandths / MAXIMUM_LOGMAR_PRECISION,
    };
  }

  getAlphaProbabilities(): Map<number, number> {
    const returnVal = new Map<number, number>();
    for (const [idx, alphaLogMARThousandths] of this.alphaLogMARThousandths.entries()) {
      const alphaProbability = this.alphaProbabilities[idx];
      returnVal.set(alphaLogMARThousandths / MAXIMUM_LOGMAR_PRECISION, alphaProbability);
    }
    return new Map(returnVal);
  }

  /**
   * When looking for the lower & upper confidence interval edges, we'll eventually come across a bucket that contains the edge we're looking for.
   *
   * This function finds the exact LogMAR value at which our edge exists.
   *
   * @param sumProbabilitySoFar How much probability we've seen so far from the buckets that have come before this one.
   *
   * @param bucketLogMAR The LogMAR value of the bucket (assumed to be in the center of the bucket)
   *
   * @param bucketProbability The pointwise probability of the bucket's LogMAR (assumed to be distributed evenly across the bucket)
   *
   * @param logMARGap The LogMAR width of the bucket
   *
   * @param confidenceIntervalBound The bound that we're looking for
   *
   * @returns The LogMAR value at which confidenceIntervalBound is met if it occurs within the bucket, or undefined if the confidence interval bound is not
   * crossed within the bucket.
   */
  static getConfidenceIntervalBoundInBucket(
    sumProbabilitySoFar: number,
    bucketLogMAR: number,
    bucketProbability: number,
    logMARGap: number,
    confidenceIntervalBound: number
  ) {
    if (confidenceIntervalBound < sumProbabilitySoFar) {
      throw new Error(
        `Confidence interval bound ${confidenceIntervalBound} was crossed in a previous bucket; this function should not have been called`
      );
    }

    if (sumProbabilitySoFar + bucketProbability < confidenceIntervalBound) {
      // The confidence interval bound isn't crossed in this bucket
      return undefined;
    }

    const missingProbability = confidenceIntervalBound - sumProbabilitySoFar;

    const bucketProbabilityPerLogMAR = bucketProbability / logMARGap;

    const boundLogMARRelativeToBucket = missingProbability / bucketProbabilityPerLogMAR;

    const absoluteBoundLogMAR = bucketLogMAR - logMARGap / 2 + boundLogMARRelativeToBucket;

    return absoluteBoundLogMAR;
  }
}
