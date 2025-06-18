import React, { useEffect, useState, useRef, useCallback } from "react";
import "./LogMARChart.css";

// Speech Recognition interfaces
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

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

interface DebugInfo {
  transcript: string;
  confidence: number;
  utterance: string | null;
  timestamp: number;
  isFinal: boolean;
}

interface CalibrationData {
  measuredHeightPx: number;
  measuredHeightCm: number;
}

interface ViewingConfiguration {
  id: string;
  name: string;
  distanceCentimeters: number;
}

interface LogMARChartProps {
  onLetterValidated?: (isCorrect: boolean) => void;
  calibrationData?: CalibrationData | null;
  viewingConfiguration?: ViewingConfiguration | null;
  onAssessmentComplete?: (results: {
    logMARScore: number;
    correctLetters: number;
    totalLetters: number;
    attemptedLetters: number;
  }) => void;
}

const LogMARChart: React.FC<LogMARChartProps> = ({
  onLetterValidated,
  calibrationData,
  viewingConfiguration,
  onAssessmentComplete,
}) => {
  const NUM_LETTERS_PER_LINE = 5;
  const NUM_ROWS = 14; // Based on the length of logMARValues (now hardcoded as per new structure)

  const [currentIndex, setCurrentIndex] = useState(0);

  // Speech recognition state
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const [debugInfo, setDebugInfo] = useState<DebugInfo[]>([]);
  const [isAssessmentFinished, setIsAssessmentFinished] = useState(false);

  // Use refs to store current state to avoid stale closures
  const currentIndexRef = useRef<number>(0);
  const expectedNextIndexRef = useRef<number>(0);

  // Military alphabet mappings only
  const MILITARY_ALPHABET_MAPPINGS: { [key: string]: string } = {
    ALPHA: "A",
    BRAVO: "B",
    CHARLIE: "C",
    "CHARLIE'S": "C",
    DELTA: "D",
    ECHO: "E",
    FOXTROT: "F",
    GOLF: "G",
    HOTEL: "H",
    INDIA: "I",
    JULIET: "J",
    KILO: "K",
    LIMA: "L",
    MIKE: "M",
    NOVEMBER: "N",
    OSCAR: "O",
    PAPA: "P",
    QUEBEC: "Q",
    ROMEO: "R",
    SIERRA: "S",
    CIARA: "S",
    TANGO: "T",
    UNIFORM: "U",
    VICTOR: "V",
    WHISKEY: "W",
    XRAY: "X",
    YANKEE: "Y",
    ZULU: "Z",
    FINISH: "FINISH",
  };

  // Helper function to convert military alphabet words to letters
  const recognizeMilitaryAlphabet = (transcript: string): string[] => {
    const words = transcript.trim().toUpperCase().split(/\s+/);
    const recognizedLetters: string[] = [];

    for (const word of words) {
      const letter = MILITARY_ALPHABET_MAPPINGS[word];
      if (letter) {
        recognizedLetters.push(letter);
      }
    }

    return recognizedLetters;
  };

  // Handle finishing the assessment
  const finishAssessment = useCallback(() => {
    // Use refs to get the current state instead of potentially stale state
    const currentAllLetters = allLettersRef.current;

    // Calculate LogMAR score: 1.1 - 0.02 per correct letter
    const correctLetters = currentAllLetters.filter(
      (letter) => letter.status === "correct"
    ).length;
    const attemptedLetters = currentAllLetters.filter(
      (letter) => letter.status === "correct" || letter.status === "incorrect"
    ).length;
    const totalLetters = currentAllLetters.length;
    const logMARScore = 1.1 - correctLetters * 0.02;

    console.log("Assessment finished");
    console.log(`Correct letters: ${correctLetters}`);
    console.log(`Attempted letters: ${attemptedLetters}`);
    console.log(`LogMAR score: ${logMARScore.toFixed(2)}`);

    // Call the callback with results
    onAssessmentComplete?.({
      logMARScore,
      correctLetters,
      totalLetters,
      attemptedLetters,
    });
  }, [onAssessmentComplete]);

  // Update refs when state changes
  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  // Initialize expected next index when component starts
  useEffect(() => {
    expectedNextIndexRef.current = 0;
  }, []);

  // Initialize speech recognition
  useEffect(() => {
    if (!window.webkitSpeechRecognition) {
      console.error("Speech recognition is not supported in this browser.");
      return;
    }

    try {
      const recognition = new window.webkitSpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognitionRef.current = recognition;

      recognition.onstart = () => {
        console.log("Speech recognition started");
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        if (event.error === "no-speech") {
          console.log("No speech detected");
        } else {
          console.error("Speech recognition error:", event);
        }
      };

      recognition.onend = () => {
        console.log("Speech recognition ended");
        // Only restart if the assessment is not finished
        if (!isAssessmentFinished && recognitionRef.current) {
          recognition.start(); // Re-enabled for continuous recognition
        }
      };

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        const result = event.results[event.results.length - 1];
        const fullTranscript = result[0].transcript; // Get the full transcript

        const confidence = result[0].confidence;
        const recognizedLetters = recognizeMilitaryAlphabet(fullTranscript);

        // Update debug info for all results
        setDebugInfo((prev) => {
          const newInfo = {
            transcript: fullTranscript,
            confidence,
            utterance:
              recognizedLetters.length > 0
                ? recognizedLetters.join(", ")
                : null,
            timestamp: Date.now(),
            isFinal: result.isFinal,
          };
          return [...prev, newInfo].slice(-5);
        });

        // Process interim results with sufficient confidence
        console.log("Speech recognition result:", {
          isFinal: result.isFinal,
          confidence,
          recognizedLetters,
          fullTranscript,
        });

        if (result.isFinal && recognizedLetters.length > 0) {
          console.log("Processing recognized letters:", recognizedLetters);

          // Process letters sequentially using index tracking
          let letterIndex = 0;

          const processNextLetter = () => {
            if (letterIndex >= recognizedLetters.length) {
              return; // All letters processed
            }

            const letter = recognizedLetters[letterIndex];

            if (letter === "FINISH") {
              setIsAssessmentFinished(true);
              finishAssessment();
              // Stop the recognition engine when assessment is finished
              if (recognitionRef.current) {
                recognitionRef.current.stop();
              }
              return;
            }

            const currentIndex = currentIndexRef.current;
            const allLetters = allLettersRef.current;

            console.log(
              "Processing letter:",
              letter,
              "current index:",
              currentIndex,
              "expected next index:",
              expectedNextIndexRef.current,
              "letter index:",
              letterIndex
            );

            // Only process if we're at the expected position
            if (
              currentIndex === expectedNextIndexRef.current &&
              currentIndex < allLetters.length
            ) {
              const currentLetterState = allLetters[currentIndex];
              const isCorrect = letter === currentLetterState.char;

              console.log("Letter comparison:", {
                guessed: letter,
                actual: currentLetterState.char,
                isCorrect,
              });

              // Update the letter state and advance to next letter
              setAllLetters((prevAllLetters) => {
                const newAllLetters = [...prevAllLetters];
                if (isCorrect) {
                  newAllLetters[currentIndex].status = "correct";
                } else {
                  newAllLetters[currentIndex].status = "incorrect";
                }

                const nextIndex = currentIndex + 1;

                // If we've reached the end of the chart, stop
                if (nextIndex >= newAllLetters.length) {
                  setCurrentIndex(newAllLetters.length);
                  return newAllLetters;
                }

                // Mark the next letter as current
                newAllLetters[nextIndex].status = "current";
                console.log("Next index set to:", nextIndex);

                setCurrentIndex(nextIndex);

                return newAllLetters;
              });

              onLetterValidated?.(isCorrect);

              // Update expected next index and move to next letter
              expectedNextIndexRef.current = currentIndex + 1;
              letterIndex++;

              // Process next letter after state update
              setTimeout(processNextLetter, 100);
            } else {
              // If we're not at the expected position, wait and try again
              setTimeout(processNextLetter, 50);
            }
          };

          // Start processing
          processNextLetter();
        }
      };

      recognition.start();
    } catch (err) {
      console.error("Error initializing speech recognition:", err);
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
    };
  }, []); // Empty dependency array - only run once

  // Additional cleanup effect for when assessment is finished
  useEffect(() => {
    if (isAssessmentFinished && recognitionRef.current) {
      console.log("Assessment finished, stopping speech recognition");
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
  }, [isAssessmentFinished]);

  // Log calibration and viewing configuration data when component mounts
  useEffect(() => {
    console.log("=== Assessment Configuration ===");

    if (calibrationData) {
      console.log("Font Size Calibration:");
      console.log(
        "  - Measured height (px):",
        calibrationData.measuredHeightPx
      );
      console.log(
        "  - Measured height (cm):",
        calibrationData.measuredHeightCm
      );
    } else {
      console.log("Font Size Calibration: Not available");
    }

    if (viewingConfiguration) {
      console.log("Viewing Configuration:");
      console.log("  - UUID:", viewingConfiguration.id);
      console.log("  - Name:", viewingConfiguration.name);
      console.log(
        "  - Distance:",
        viewingConfiguration.distanceCentimeters,
        "cm from screen"
      );
    } else {
      console.log("Viewing Configuration: Not available");
    }

    console.log("================================");
  }, [calibrationData, viewingConfiguration]);

  // Helper to calculate letter size for a row
  function getLetterSizePx(rowIndex: number) {
    if (!calibrationData || !viewingConfiguration) return 0;
    // Constants for LogMAR calculation
    const LOGMAR_1_0_ARC_MINUTES = 10; // 1.0 LogMAR = 10 arc minutes
    const LOGMAR_1_0_ANGLE_DEGREES = LOGMAR_1_0_ARC_MINUTES / 60; // Convert arc minutes to degrees
    const viewingDistanceCm = viewingConfiguration.distanceCentimeters;
    const logmar1_0AngleRadians = (LOGMAR_1_0_ANGLE_DEGREES * Math.PI) / 180;
    const logmar1_0HeightCm =
      2 * viewingDistanceCm * Math.tan(logmar1_0AngleRadians);
    const pixelsPerCm =
      calibrationData.measuredHeightPx / calibrationData.measuredHeightCm;
    const logmar1_0SizePx = logmar1_0HeightCm * pixelsPerCm;
    const logmarLevel = 1.0 - rowIndex * 0.1;
    const sizeRatio = Math.pow(10, logmarLevel - 1.0);
    return Math.round(logmar1_0SizePx * sizeRatio);
  }

  // Add new state for current row's letters and results
  const [currentRowIndex, setCurrentRowIndex] = useState(0); // 0 = 1.0 LogMAR
  const [currentRowLetters, setCurrentRowLetters] = useState<string[]>([]);
  const [currentRowResults, setCurrentRowResults] = useState<
    ("correct" | "incorrect" | null)[]
  >([]);
  const [completedRows, setCompletedRows] = useState<
    {
      rowIndex: number;
      letters: string[];
      results: ("correct" | "incorrect" | null)[];
    }[]
  >([]);

  // Helper to generate random letters for a row
  function generateRandomLetters(num: number) {
    const possible = "CDEFHKNOVZ"; // or whatever your chart uses
    return Array.from(
      { length: num },
      () => possible[Math.floor(Math.random() * possible.length)]
    );
  }

  // On mount or when currentRowIndex changes, generate new row letters
  useEffect(() => {
    setCurrentRowLetters(generateRandomLetters(NUM_LETTERS_PER_LINE));
    setCurrentRowResults(Array(NUM_LETTERS_PER_LINE).fill(null));
  }, [currentRowIndex]);

  // When the row is completed, check if we should advance or finish
  useEffect(() => {
    // Only run if at least one answer has been given (prevents running on mount)
    if (currentRowResults.every((r) => r === null)) return;
    if (currentRowResults.every((r) => r !== null)) {
      const numCorrect = currentRowResults.filter(
        (r) => r === "correct"
      ).length;
      setCompletedRows((prev) => [
        ...prev,
        {
          rowIndex: currentRowIndex,
          letters: currentRowLetters,
          results: currentRowResults,
        },
      ]);
      if (numCorrect >= 3) {
        setCurrentRowIndex(currentRowIndex + 1);
      } else {
        // Finish test, call onAssessmentComplete
        // Calculate results
        const allRows = [
          ...completedRows,
          {
            rowIndex: currentRowIndex,
            letters: currentRowLetters,
            results: currentRowResults,
          },
        ];
        const correctLetters = allRows.reduce(
          (sum, row) => sum + row.results.filter((r) => r === "correct").length,
          0
        );
        const attemptedLetters = allRows.reduce(
          (sum, row) =>
            sum +
            row.results.filter((r) => r === "correct" || r === "incorrect")
              .length,
          0
        );
        const totalLetters = allRows.reduce(
          (sum, row) => sum + row.letters.length,
          0
        );
        // LogMAR score: 1.1 - 0.02 per correct letter
        const logMARScore = 1.1 - correctLetters * 0.02;
        onAssessmentComplete?.({
          logMARScore,
          correctLetters,
          attemptedLetters,
          totalLetters,
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentRowResults]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        width: "100vw",
        minHeight: "100vh",
        margin: 0,
        padding: 0,
        boxSizing: "border-box",
      }}
    >
      {/* Speech Recognition Debug Info (fixed at top) */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          zIndex: 1000,
          padding: "1rem",
          backgroundColor: "#f0f0f0",
          borderBottom: "2px solid #ccc",
          fontFamily: "monospace",
          fontSize: "1rem",
          maxHeight: "200px",
          overflowY: "auto",
        }}
      >
        <div
          style={{
            marginBottom: "0.5rem",
            fontWeight: "bold",
            fontSize: "1.1rem",
          }}
        >
          Speech Recognition Debug Info:
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
              {info.utterance && ` → Detected utterance: "${info.utterance}"`}
              {!info.isFinal && " (interim)"}
            </div>
          ))
        )}
      </div>

      {/* Centered chart row below debug box */}
      <div
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          width: "100vw",
          minHeight: "100vh",
          // No marginTop! Chart row is always centered, debug box will occlude if needed
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <div className="chart-row">
            {currentRowLetters.map((char, idx) => (
              <React.Fragment key={idx}>
                <span
                  className={`letter ${currentRowResults[idx]}`}
                  style={{
                    fontSize: `${getLetterSizePx(currentRowIndex)}px`,
                    lineHeight: `${getLetterSizePx(currentRowIndex)}px`,
                  }}
                >
                  {char}
                </span>
                {idx < currentRowLetters.length - 1 && (
                  <span
                    className="spacer-char"
                    aria-hidden="true"
                    style={{
                      fontSize: `${getLetterSizePx(currentRowIndex)}px`,
                      lineHeight: `${getLetterSizePx(currentRowIndex)}px`,
                      color: "transparent",
                      userSelect: "none",
                      margin: 0,
                    }}
                  >
                    C
                  </span>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LogMARChart;
