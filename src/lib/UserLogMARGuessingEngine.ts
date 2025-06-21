/**
 * This class takes a very well-informed guess at what the user's LogMAR prescription is based on
 * their performance on the LogMAR chart.
 *
 * It does this by implementing the QUEST+ algorithm ( https://jov.arvojournals.org/article.aspx?doi=10.1167/17.3.10 )
 * for identifying the psychometric distribution corresponding to the user's results.
 *
 * You can think of it like a fancy form of linear regression:
 * "Given the user's results, which parameters define a psychometric function ( https://en.wikipedia.org/wiki/Psychometric_function )
 * that most closely matches the user's results?""
 *
 * I'd like to thank ChatGPT for doing a GREAT job explaining this to me.
 */
export class UserLogMARGuessingEngine {
  private alphaPriors: Map<number, number>;

  /**
   *
   * @param alphaPriors A probability graph of LogMAR -> probability that
   * a psychometric function with an "alpha" parameter of that LogMAR value most
   * closely matches the user's data.
   */
  constructor(alphaPriors: Map<number, number>) {
    this.alphaPriors = new Map(alphaPriors);
  }

  /**
   * Given the current priors in the engine (i.e. the current best guess about which psychometric function
   * most closely matches the results we've seen), have the engine propose the size of the next
   * line to show to the user that would maximize the information we'd gain from the user
   * reading the line.
   */
  proposeNextTrialLogMAR() {
    // TODO Use a better method of choosing the next trial - prior mean is the basic version,
    // but we can do better with an entropy minimization scheme. I don't do this now because
    // it's not that important - just reduces the number of letters we have to show the user.
  }

  /**
   * This is the logistic psychometric function definition: https://en.wikipedia.org/wiki/Logistic_function
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
   * @param logMAR The LogMAR value for which to calculate the probability, given the previous parameters.
   *
   * @returns A [0,1) number representing the chance that, for the given LogMAR,
   */
  static getProbabilityCorrect(
    alpha: number,
    beta: number,
    gamma: number,
    lambda: number,
    logMAR: number
  ): number {
    return (
      gamma + (1 - gamma - lambda) / (1 + Math.exp(-beta * (logMAR - alpha)))
    );
  }
}
