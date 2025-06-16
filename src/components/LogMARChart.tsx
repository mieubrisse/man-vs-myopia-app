import React, {
  useEffect,
  useState,
  useImperativeHandle,
  forwardRef,
  useRef,
} from "react";
import "./LogMARChart.css";
import LogMARResults from "./LogMARResults";
import SpeechRecognizer from "./SpeechRecognizer";

interface LetterState {
  char: string;
  status?: "correct" | "incorrect" | "current" | "pending";
}

interface LogMARChartProps {
  onLetterValidated?: (isCorrect: boolean) => void;
  onTestComplete?: (score: number) => void;
}

export interface LogMARChartHandle {
  guessLetter: (letter: string) => void;
  finishTest: () => void;
  resetTest: () => void;
}

const LogMARChart = forwardRef<LogMARChartHandle, LogMARChartProps>(
  ({ onLetterValidated, onTestComplete }, ref) => {
    const SLOAN_LETTERS = ["C", "D", "H", "K", "N", "O", "R", "S", "V", "Z"];
    const NUM_LETTERS_PER_LINE = 5;
    const NUM_ROWS = 14;
    const BASE_LOG_MAR = 0.1; // Starting LogMAR value
    const LOG_MAR_INCREMENT = 0.02; // Increment per incorrect letter

    const [allLetters, setAllLetters] = useState<LetterState[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isTestComplete, setIsTestComplete] = useState(false);
    const [finalScore, setFinalScore] = useState<number | null>(null);
    const chartRef = useRef<LogMARChartHandle>(null);

    const initializeChart = () => {
      const initialAllLetters: LetterState[] = [];
      for (let r = 0; r < NUM_ROWS; r++) {
        for (let i = 0; i < NUM_LETTERS_PER_LINE; i++) {
          const randomIndex = Math.floor(Math.random() * SLOAN_LETTERS.length);
          initialAllLetters.push({
            char: SLOAN_LETTERS[randomIndex],
            status: "pending",
          });
        }
      }

      if (initialAllLetters.length > 0) {
        initialAllLetters[0].status = "current";
      }

      setAllLetters(initialAllLetters);
      setCurrentIndex(0);
      setIsTestComplete(false);
      setFinalScore(null);
    };

    useEffect(() => {
      initializeChart();
    }, []);

    // Calculate LogMAR score
    const calculateLogMARScore = () => {
      const incorrectLetters = allLetters.filter(
        (letter) => letter.status === "incorrect"
      ).length;
      return BASE_LOG_MAR + LOG_MAR_INCREMENT * incorrectLetters;
    };

    // Handle a letter guess
    const guessLetter = (letter: string) => {
      if (isTestComplete) return;

      setAllLetters((prevAllLetters) => {
        const newAllLetters = [...prevAllLetters];
        const currentLetterState = newAllLetters[currentIndex];

        const isCorrect = letter === currentLetterState.char;

        if (isCorrect) {
          currentLetterState.status = "correct";
        } else {
          currentLetterState.status = "incorrect";
        }

        onLetterValidated?.(isCorrect);

        const nextIndex = currentIndex + 1;

        if (nextIndex >= newAllLetters.length) {
          const score = calculateLogMARScore();
          setIsTestComplete(true);
          setFinalScore(score);
          onTestComplete?.(score);
          return newAllLetters;
        }

        newAllLetters[nextIndex].status = "current";
        setCurrentIndex(nextIndex);

        return newAllLetters;
      });
    };

    // Handle test completion
    const finishTest = () => {
      if (!isTestComplete) {
        const score = calculateLogMARScore();
        setIsTestComplete(true);
        setFinalScore(score);
        onTestComplete?.(score);
      }
    };

    const resetTest = () => {
      initializeChart();
    };

    // Expose the functions to parent components
    useImperativeHandle(ref, () => ({
      guessLetter,
      finishTest,
      resetTest,
    }));

    if (isTestComplete && finalScore !== null) {
      return <LogMARResults score={finalScore} onRestart={resetTest} />;
    }

    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          width: "100%",
        }}
      >
        <SpeechRecognizer chartRef={chartRef} isTestComplete={isTestComplete} />
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          {allLetters.length > 0 ? (
            Array.from({ length: NUM_ROWS }).map((_, rowIndex) => (
              <div
                key={rowIndex}
                className="chart-row"
                style={{ "--row-index": rowIndex } as React.CSSProperties}
              >
                {Array.from({ length: NUM_LETTERS_PER_LINE }).map(
                  (_, colIndex) => {
                    const itemIndex =
                      rowIndex * NUM_LETTERS_PER_LINE + colIndex;
                    const item = allLetters[itemIndex];

                    return (
                      <React.Fragment key={colIndex}>
                        <span className={`letter ${item.status || ""}`}>
                          {item.char}
                        </span>
                        {colIndex < NUM_LETTERS_PER_LINE - 1 && (
                          <span className="spacer-char">C</span>
                        )}
                      </React.Fragment>
                    );
                  }
                )}
              </div>
            ))
          ) : (
            <div>Loading chart...</div>
          )}
        </div>
      </div>
    );
  }
);

export default LogMARChart;
