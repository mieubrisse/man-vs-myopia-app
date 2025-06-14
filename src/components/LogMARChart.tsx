import React, {
  useEffect,
  useState,
  useImperativeHandle,
  forwardRef,
} from "react";
import "./LogMARChart.css";

interface LetterState {
  char: string;
  isSpacer?: boolean;
  status?: "correct" | "incorrect" | "current" | undefined;
}

interface LogMARChartProps {
  onLetterValidated?: (isCorrect: boolean) => void;
}

export interface LogMARChartHandle {
  guessLetter: (letter: string) => void;
}

const LogMARChart = forwardRef<LogMARChartHandle, LogMARChartProps>(
  ({ onLetterValidated }, ref) => {
    const SLOAN_LETTERS = ["C", "D", "H", "K", "N", "O", "R", "S", "V", "Z"];
    const NUM_LETTERS_PER_LINE = 5;

    const logMARValues = [
      1.0, 0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3, 0.2, 0.1, 0.0, -0.1, -0.2, -0.3,
    ];

    const [letters, setLetters] = useState<LetterState[][]>([]);
    const [currentRow, setCurrentRow] = useState(0);
    const [currentCol, setCurrentCol] = useState(0);

    // Initialize the chart with random letters
    useEffect(() => {
      const initialLetters = logMARValues.map(() => {
        const row: LetterState[] = [];
        for (let i = 0; i < NUM_LETTERS_PER_LINE; i++) {
          const randomIndex = Math.floor(Math.random() * SLOAN_LETTERS.length);
          row.push({ char: SLOAN_LETTERS[randomIndex] });
          if (i < NUM_LETTERS_PER_LINE - 1) {
            row.push({ char: "C", isSpacer: true });
          }
        }
        return row;
      });

      if (initialLetters[0] && initialLetters[0][0]) {
        initialLetters[0][0].status = "current";
      }

      setLetters(initialLetters);
    }, []);

    // Handle a letter guess
    const guessLetter = (letter: string) => {
      console.log("guessLetter called with:", letter, "current position:", {
        row: currentRow,
        col: currentCol,
      });

      setLetters((prevLetters) => {
        const newLetters = [...prevLetters];
        const currentLetter = newLetters[currentRow][currentCol];

        if (!currentLetter.isSpacer) {
          const isCorrect = letter === currentLetter.char;
          console.log("Letter comparison:", {
            guessed: letter,
            actual: currentLetter.char,
            isCorrect,
          });

          if (isCorrect) {
            currentLetter.status = "correct";
          } else {
            currentLetter.status = "incorrect";
          }

          onLetterValidated?.(isCorrect);

          // Calculate next position
          let nextRow = currentRow;
          let nextCol = currentCol + 1;

          // If we've reached the end of the row, move to the next row
          if (nextCol >= newLetters[nextRow].length) {
            nextRow++;
            nextCol = 0;
          }

          // If we've reached the end of the chart, stop
          if (nextRow >= newLetters.length) {
            return newLetters;
          }

          // Update the next letter's status to current
          newLetters[nextRow][nextCol].status = "current";
          console.log("Next position set to:", { row: nextRow, col: nextCol });

          // Update current position state after marking the next letter
          setCurrentRow(nextRow);
          setCurrentCol(nextCol);
        }

        return newLetters;
      });
    };

    // Expose the guessLetter function to parent components
    useImperativeHandle(ref, () => ({
      guessLetter,
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
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          {letters.map((row, rowIndex) => (
            <div
              key={rowIndex}
              className="chart-row"
              style={{ "--row-index": rowIndex } as React.CSSProperties}
            >
              {row.map((item, colIndex) => (
                <span
                  key={colIndex}
                  className={`${item.isSpacer ? "spacer-char" : "letter"} ${
                    item.status || ""
                  }`}
                >
                  {item.char}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }
);

export default LogMARChart;
