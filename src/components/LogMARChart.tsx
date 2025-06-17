import React, {
  useEffect,
  useState,
  useImperativeHandle,
  forwardRef,
} from "react";
import "./LogMARChart.css";

interface LetterState {
  char: string;
  status?: "correct" | "incorrect" | "current" | "pending";
}

interface CalibrationData {
  measuredHeightPx: number;
  measuredHeightMm: number;
}

interface LogMARChartProps {
  onLetterValidated?: (isCorrect: boolean) => void;
  calibrationData?: CalibrationData | null;
}

export interface LogMARChartHandle {
  guessLetter: (letter: string) => void;
  finishAssessment: () => void;
}

const LogMARChart = forwardRef<LogMARChartHandle, LogMARChartProps>(
  ({ onLetterValidated, calibrationData }, ref) => {
    const SLOAN_LETTERS = ["C", "D", "H", "K", "N", "O", "R", "S", "V", "Z"];
    const NUM_LETTERS_PER_LINE = 5;
    const NUM_ROWS = 14; // Based on the length of logMARValues (now hardcoded as per new structure)

    const [allLetters, setAllLetters] = useState<LetterState[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);

    // Log calibration data when component mounts
    useEffect(() => {
      if (calibrationData) {
        console.log("Assessment loaded with calibration data:");
        console.log("Measured height (px):", calibrationData.measuredHeightPx);
        console.log("Measured height (mm):", calibrationData.measuredHeightMm);
      }
    }, [calibrationData]);

    // Initialize the chart with random letters (only actual letters, no spacers)
    useEffect(() => {
      const initialAllLetters: LetterState[] = [];
      for (let r = 0; r < NUM_ROWS; r++) {
        for (let i = 0; i < NUM_LETTERS_PER_LINE; i++) {
          const randomIndex = Math.floor(Math.random() * SLOAN_LETTERS.length);
          initialAllLetters.push({
            char: SLOAN_LETTERS[randomIndex],
            status: "pending",
          }); // Default to 'pending'
        }
      }

      if (initialAllLetters.length > 0) {
        initialAllLetters[0].status = "current"; // First letter is 'current'
      }

      setAllLetters(initialAllLetters);
      console.log(
        "All letters initialized in useEffect:",
        initialAllLetters.length,
        initialAllLetters
      );
      setCurrentIndex(0);
    }, []);

    // Handle a letter guess
    const guessLetter = (letter: string) => {
      console.log(
        "guessLetter called with:",
        letter,
        "current index:",
        currentIndex
      );

      setAllLetters((prevAllLetters) => {
        const newAllLetters = [...prevAllLetters];
        const currentLetterState = newAllLetters[currentIndex];

        // No need to check for spacer here, as allLetters only contains actual letters
        const isCorrect = letter === currentLetterState.char;
        console.log("Letter comparison:", {
          guessed: letter,
          actual: currentLetterState.char,
          isCorrect,
        });

        if (isCorrect) {
          currentLetterState.status = "correct";
        } else {
          currentLetterState.status = "incorrect";
        }

        onLetterValidated?.(isCorrect);

        const nextIndex = currentIndex + 1; // Simply move to the next letter

        // If we've reached the end of the chart, stop
        if (nextIndex >= newAllLetters.length) {
          // No more letters to guess
          setCurrentIndex(newAllLetters.length); // Set to end to prevent further processing
          return newAllLetters;
        }

        // Mark the next letter as current
        newAllLetters[nextIndex].status = "current";
        console.log("Next index set to:", nextIndex);

        setCurrentIndex(nextIndex); // Update the main index state

        return newAllLetters;
      });
    };

    // Handle finishing the assessment
    const finishAssessment = () => {
      // Calculate LogMAR score: 1.1 - 0.02 per correct letter
      const correctLetters = allLetters.filter(
        (letter) => letter.status === "correct"
      ).length;
      const logMARScore = 1.1 - correctLetters * 0.02;

      console.log("Assessment finished");
      console.log(`Correct letters: ${correctLetters}`);
      console.log(`LogMAR score: ${logMARScore.toFixed(2)}`);
    };

    // Expose the guessLetter function to parent components
    useImperativeHandle(ref, () => ({
      guessLetter,
      finishAssessment,
    }));

    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          width: "100%",
        }}
      >
        {calibrationData && (
          <div className="calibration-info">
            {calibrationData.measuredHeightPx}px ={" "}
            {calibrationData.measuredHeightMm}mm
          </div>
        )}

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
                          <span className="spacer-char">C</span> // Spacer added here for display
                        )}
                      </React.Fragment>
                    );
                  }
                )}
              </div>
            ))
          ) : (
            <div>Loading chart...</div> // Or any other loading indicator
          )}
        </div>
      </div>
    );
  }
);

export default LogMARChart;
