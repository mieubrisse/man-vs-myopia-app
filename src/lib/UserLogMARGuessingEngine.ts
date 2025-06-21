export interface UserLogMARGuess {
  logMARGuess: number;
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
export class UserLogMARGuessingEngine {
  // TODO guess this dynamically using Bayesian inference
  private static LOGISTIC_PSYCHOMETRIC_BETA: number = 1.0;

  // TODO maybe guess this dynamically???
  private static LOGISTIC_PSYCHOMETRIC_LAMBDA: number = 0.01; // Chose this number completely arbitrarily

  /*
  This variable says, the guesses returned by the probabil
  WHAT CHATGPT HAS TO SAY ABOUT LOGMAR CONFIDENCE INTERVALS:

  Because the natural repeatability floor of a paper ETDRS is already ± 0.15 logMAR, any algorithm that
  tightens the credible interval width to ≤ 0.10 logMAR is unequivocally more precise than standard care.
  Going down to ± 0.05 logMAR buys you a factor-of-three margin over the paper chart’s noise—very useful for:
	•	Detecting modest disease progression early (e.g., −0.08 logMAR change).
	•	Reducing sample size in trials that use acuity as an endpoint.
	•	Giving home users feedback sensitive enough to see day-to-day fluctuations.

  Trade-off rule of thumb
    •	Halving the confidence interval width roughly doubles the number of informative trials once you’re below ± 0.10 logMAR.
    •	Below ± 0.03 logMAR the benefit/effort curve flattens; observer variability (blinks, attention) dominates.
  */

  private alphaPriors: Map<number, number>;
  private numDistinctOptotypes: number;
  private confidenceInterval: number;

  /**
   *
   * @param alphaPriors A probability graph of LogMAR -> probability that
   * a psychometric function with an "alpha" parameter of that LogMAR value most
   * closely matches the user's data.
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
    this.alphaPriors = new Map(alphaPriors);
    this.numDistinctOptotypes = numDistinctOptotypes;
    this.confidenceInterval = confidenceInterval;
  }

  /**
   * Given the current priors in the engine (i.e. the current best guess about which psychometric function
   * most closely matches the results we've seen), have the engine propose the size of the next
   * letters to show to the user such that we maximize the information the engine gains from
   * the user getting tested against that line.
   */
  proposeNextTrialLogMAR(): number {
    // TODO Use a better method of choosing the next trial - prior mean is the basic version,
    // but we can do better with an entropy minimization scheme. I don't do this now because
    // it's not that important - just reduces the number of letters we have to show the user.
    let expectedValue = 0;
    for (const [alphaLogMAR, probability] of this.alphaPriors) {
      expectedValue += alphaLogMAR * probability;
    }

    return expectedValue;
  }

  /**
   * Updates the engine with the result of a test.
   * @param logMARTested The size of the letter that was tested, in LogMAR.
   * @param gotCorrectResult Whether the user correctly ascertained the letter (either through guessing or actually identifying).
   */
  updateGivenTrialResult(logMARTested: number, gotCorrectResult: boolean) {
    const alphaRelativeBeliefs: Map<number, number> = new Map();

    // We'll use this to re-normalize relative belief in alpha back to a probability distribution
    // (The Bayesian posterior, which will become the prior for the next iteration)
    let sumRelativeBelief: number = 0;

    // To update our priors, we:
    // 1. Iterate over each alpha in the priors grid, and calculate Ψ(alpha, logMARTested) to see what the psychometric
    //  function has to say about the likelihood of the user getting it right.
    // 2. Compare what that alpha says about the likelihood of getting it right vs whether the user actually got it right
    // 3. Update the likelihood of that alpha based on how close/far the Ψ(alpha, logMARTested) was to the user's actual result
    // The resulting grid of (alpha, probability) form our priors.
    for (const [alphaLogMAR, probabilityOfAlpha] of this.alphaPriors) {
      // This is the likelihood of the user getting it correct at the given alpha & tested LogMAR size
      const likelihoodOfCorrectGivenAlpha =
        UserLogMARGuessingEngine.calculateLogisticPsychometric(
          logMARTested,
          alphaLogMAR,
          UserLogMARGuessingEngine.LOGISTIC_PSYCHOMETRIC_BETA,
          1 / this.numDistinctOptotypes,
          UserLogMARGuessingEngine.LOGISTIC_PSYCHOMETRIC_LAMBDA
        );

      // Incorporate failure if the user failed
      let likelihoodOfGivenAlpha: number;
      if (gotCorrectResult) {
        likelihoodOfGivenAlpha = likelihoodOfCorrectGivenAlpha;
      } else {
        likelihoodOfGivenAlpha = 1 - likelihoodOfCorrectGivenAlpha;
      }

      // Now we adjust each alpha based on how confidently it stated that the user's guess would match what the user actually did
      // For example:
      // - Alphas that confidently state the user will get it right and are correct are adjusted up a lot
      // - Alphas that confidently state the user will get it right and are wrong are adjusted down a lot
      const relativeBeliefInAlpha = probabilityOfAlpha * likelihoodOfGivenAlpha;

      alphaRelativeBeliefs.set(alphaLogMAR, relativeBeliefInAlpha);

      sumRelativeBelief += relativeBeliefInAlpha;
    }

    // Now we transform relative belief back into probabilities
    const alphaPosteriors: Map<number, number> = new Map();
    for (const [alphaLogMAR, relativeBelief] of alphaRelativeBeliefs) {
      alphaPosteriors.set(alphaLogMAR, relativeBelief / sumRelativeBelief);
    }

    // Now, use the posterior as the prior for our next trial
    this.alphaPriors = alphaPosteriors;
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
    let guessedLogMAR: number = 0;
    for (const [alphaLogMAR, alphaProbability] of this.alphaPriors) {
      guessedLogMAR += alphaLogMAR * alphaProbability;
    }
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
  static calculateLogisticPsychometric(
    givenLogMAR: number,
    alpha: number,
    beta: number,
    gamma: number,
    lambda: number
  ): number {
    return (
      gamma +
      (1 - lambda - gamma) / (1 + Math.exp(-beta * (givenLogMAR - alpha)))
    );
  }
}
