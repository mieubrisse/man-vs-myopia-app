import React, { useEffect, useState, useRef } from "react";
import "./LogMARChart.css";

// Add Web Speech API type declarations
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (event: Event) => void;
  onend: (event: Event) => void;
  onerror: (event: SpeechRecognitionErrorEvent) => void;
  onresult: (event: SpeechRecognitionEvent) => void;
  start(): void;
  stop(): void;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

interface LetterState {
  char: string;
  isSpacer?: boolean;
  status?: "correct" | "incorrect" | "current" | undefined;
}

interface DebugInfo {
  transcript: string;
  confidence: number;
  timestamp: number;
}

const LogMARChart: React.FC = () => {
  const SLOAN_LETTERS = ["C", "D", "H", "K", "N", "O", "R", "S", "V", "Z"];
  const NUM_LETTERS_PER_LINE = 5;
  const CONFIDENCE_THRESHOLD = 0.6;

  // Common ways people might say each letter
  const LETTER_MAPPINGS: { [key: string]: string[] } = {
    C: ["C", "SEE", "SEA", "CEE"],
    D: ["D", "DEE", "DE"],
    H: ["H", "AITCH", "HATCH"],
    K: ["K", "KAY", "KAYE"],
    N: ["N", "EN", "END"],
    O: ["O", "OH", "ZERO"],
    R: ["R", "ARE", "OUR", "ARR"],
    S: ["S", "ESS", "ES"],
    V: ["V", "VEE", "VEE"],
    Z: ["Z", "ZEE", "ZED", "ZEE"],
  };

  const logMARValues = [
    1.0, 0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3, 0.2, 0.1, 0.0, -0.1, -0.2, -0.3,
  ];

  const [letters, setLetters] = useState<LetterState[][]>([]);
  const [currentRow, setCurrentRow] = useState(0);
  const [currentCol, setCurrentCol] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<DebugInfo[]>([]);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

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

  // Initialize speech recognition
  useEffect(() => {
    if ("SpeechRecognition" in window || "webkitSpeechRecognition" in window) {
      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = "en-US";

      recognitionRef.current.onstart = () => {
        console.log("Speech recognition started");
        setError(null);
      };

      recognitionRef.current.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error("Speech recognition error:", event.error);
        setError(`Speech recognition error: ${event.error}`);
      };

      recognitionRef.current.onend = () => {
        console.log("Speech recognition ended");
        // Restart recognition if it ends unexpectedly
        if (recognitionRef.current) {
          recognitionRef.current.start();
        }
      };

      recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
        console.log("Speech recognition result received:", event.results);
        const result = event.results[event.results.length - 1];
        const transcript = result[0].transcript.trim().toUpperCase();
        const confidence = result[0].confidence;
        console.log(
          "Transcript:",
          transcript,
          "Confidence:",
          confidence,
          "Is Final:",
          result.isFinal
        );

        // Only update debug info for final results
        if (result.isFinal) {
          setDebugInfo((prev) => {
            const newInfo = {
              transcript,
              confidence,
              timestamp: Date.now(),
            };
            return [...prev, newInfo].slice(-5);
          });
        }

        if (!result.isFinal || confidence < CONFIDENCE_THRESHOLD) {
          console.log("Skipping result - not final or low confidence");
          return;
        }

        setLetters((prevLetters) => {
          const newLetters = [...prevLetters];
          const currentLetter = newLetters[currentRow][currentCol];

          console.log("Current position:", {
            row: currentRow,
            col: currentCol,
          });
          console.log("Current letter:", currentLetter);

          if (!currentLetter.isSpacer) {
            const isCorrect = isLetterMatch(transcript, currentLetter.char);
            console.log(
              "Checking if",
              transcript,
              "matches",
              currentLetter.char,
              "Result:",
              isCorrect
            );

            if (isCorrect) {
              console.log("Marking as correct");
              currentLetter.status = "correct";
            } else {
              console.log("Marking as incorrect");
              currentLetter.status = "incorrect";
            }

            let nextCol = currentCol + 1;
            let nextRow = currentRow;

            while (
              nextCol < newLetters[nextRow].length &&
              newLetters[nextRow][nextCol].isSpacer
            ) {
              nextCol++;
            }

            if (nextCol >= newLetters[nextRow].length) {
              nextRow++;
              nextCol = 0;
              while (
                nextCol < newLetters[nextRow].length &&
                newLetters[nextRow][nextCol].isSpacer
              ) {
                nextCol++;
              }
            }

            if (nextRow < newLetters.length) {
              console.log("Moving to next position:", {
                row: nextRow,
                col: nextCol,
              });
              setCurrentRow(nextRow);
              setCurrentCol(nextCol);
              newLetters[nextRow][nextCol].status = "current";
            }
          } else {
            console.log("Current position is a spacer, skipping");
          }

          return newLetters;
        });
      };

      try {
        recognitionRef.current.start();
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        setError(
          `Failed to start speech recognition: ${errorMessage}. Please ensure you have granted microphone permissions.`
        );
      }
    } else {
      setError(
        "Speech recognition is not supported in your browser. Please use Chrome, Edge, or Safari."
      );
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [currentRow, currentCol]);

  // Helper function to check if a transcript matches a letter
  const isLetterMatch = (transcript: string, letter: string): boolean => {
    const mappings = LETTER_MAPPINGS[letter] || [letter];
    return mappings.some((mapping) => transcript.includes(mapping));
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        width: "100%",
      }}
    >
      {error && (
        <div
          style={{
            color: "red",
            marginBottom: "1rem",
            padding: "0.5rem",
            border: "1px solid red",
          }}
        >
          {error}
        </div>
      )}
      <div
        style={{
          marginBottom: "1rem",
          padding: "1rem",
          backgroundColor: "#f0f0f0",
          borderRadius: "4px",
          fontFamily: "monospace",
          fontSize: "1rem",
          border: "2px solid #ccc",
          width: "80%",
          maxWidth: "600px",
        }}
      >
        <div
          style={{
            marginBottom: "0.5rem",
            fontWeight: "bold",
            fontSize: "1.1rem",
          }}
        >
          Debug Info:
        </div>
        {debugInfo.length === 0 ? (
          <div style={{ color: "#666" }}>Waiting for speech input...</div>
        ) : (
          debugInfo.map((info, index) => (
            <div
              key={info.timestamp}
              style={{
                marginBottom: "0.5rem",
                padding: "0.25rem",
                backgroundColor:
                  index === debugInfo.length - 1 ? "#e0e0e0" : "transparent",
              }}
            >
              {`[${index + 1}] "${info.transcript}" (${(
                info.confidence * 100
              ).toFixed(1)}% confidence)`}
            </div>
          ))
        )}
      </div>
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
};

export default LogMARChart;
