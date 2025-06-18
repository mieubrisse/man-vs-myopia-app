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

interface LetterState {
  char: string;
  status?: "correct" | "incorrect" | "current" | "pending";
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
  const SLOAN_LETTERS = ["C", "D", "H", "K", "N", "O", "R", "S", "V", "Z"];
  const NUM_LETTERS_PER_LINE = 5;
  const NUM_ROWS = 14; // Based on the length of logMARValues (now hardcoded as per new structure)

  const [allLetters, setAllLetters] = useState<LetterState[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentRow, setCurrentRow] = useState(0);

  // Speech recognition state
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const [debugInfo, setDebugInfo] = useState<DebugInfo[]>([]);
  const [isAssessmentFinished, setIsAssessmentFinished] = useState(false);

  // Use refs to store current state to avoid stale closures
  const currentIndexRef = useRef<number>(0);
  const allLettersRef = useRef<LetterState[]>([]);
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

  useEffect(() => {
    allLettersRef.current = allLetters;
  }, [allLetters]);

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

  // Calculate LogMAR letter sizes based on viewing distance and calibration
  const calculateLetterSizes = useCallback(() => {
    if (!calibrationData || !viewingConfiguration) {
      return null;
    }

    // Constants for LogMAR calculation
    const LOGMAR_1_0_ARC_MINUTES = 10; // 1.0 LogMAR = 10 arc minutes
    const LOGMAR_1_0_ANGLE_DEGREES = LOGMAR_1_0_ARC_MINUTES / 60; // Convert arc minutes to degrees

    // Convert viewing distance from cm to meters for calculation
    const viewingDistanceCm = viewingConfiguration.distanceCentimeters;

    // Calculate the height of 1.0 LogMAR characters using geometry
    // height = 2 * distance * tan(angle)
    const logmar1_0AngleRadians = (LOGMAR_1_0_ANGLE_DEGREES * Math.PI) / 180; // Convert degrees to radians
    const logmar1_0HeightCm =
      2 * viewingDistanceCm * Math.tan(logmar1_0AngleRadians);

    // Convert calibration data: measuredHeightPx = measuredHeightCm
    const pixelsPerCm =
      calibrationData.measuredHeightPx / calibrationData.measuredHeightCm;

    // Calculate the pixel size for 1.0 LogMAR letters
    const logmar1_0SizePx = logmar1_0HeightCm * pixelsPerCm;

    // Calculate sizes for all LogMAR levels (1.0 at top, decreasing by 0.1 per row)
    const letterSizes: number[] = [];
    for (let i = 0; i < NUM_ROWS; i++) {
      const logmarLevel = 1.0 - i * 0.1;
      const sizeRatio = Math.pow(10, logmarLevel - 1.0); // Correct geometric progression
      const letterSizePx = Math.round(logmar1_0SizePx * sizeRatio); // Round to nearest whole pixel
      letterSizes.push(letterSizePx);
    }

    console.log("LogMAR letter sizes calculated:", {
      viewingDistanceCm,
      logmar1_0ArcMinutes: LOGMAR_1_0_ARC_MINUTES,
      logmar1_0AngleDegrees: LOGMAR_1_0_ANGLE_DEGREES,
      logmar1_0AngleRadians,
      logmar1_0HeightCm,
      logmar1_0SizePx,
      letterSizes,
    });

    return letterSizes;
  }, [calibrationData, viewingConfiguration]);

  // Get letter sizes for the chart
  const letterSizes = calculateLetterSizes();

  // Debug: Log the full letterSizes array
  console.log("Full letterSizes array:", letterSizes);

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

  // When a row is completed, advance to the next row
  useEffect(() => {
    if (allLetters.length === 0) return;
    // Check if all letters in the current row are not 'pending' or 'current'
    const startIdx = currentRow * NUM_LETTERS_PER_LINE;
    const endIdx = startIdx + NUM_LETTERS_PER_LINE;
    const rowLetters = allLetters.slice(startIdx, endIdx);
    const allAttempted = rowLetters.every(
      (l) => l.status === "correct" || l.status === "incorrect"
    );
    if (allAttempted && currentRow < NUM_ROWS - 1) {
      setCurrentRow(currentRow + 1);
      // Set the first letter of the next row to 'current' if not already set
      setAllLetters((prev) => {
        const updated = [...prev];
        const nextRowStart = (currentRow + 1) * NUM_LETTERS_PER_LINE;
        if (
          updated[nextRowStart] &&
          updated[nextRowStart].status === "pending"
        ) {
          updated[nextRowStart].status = "current";
        }
        return updated;
      });
    }
  }, [allLetters, currentRow]);

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
          {allLetters.length > 0 && letterSizes ? (
            (() => {
              const rowIndex = currentRow;
              const letterSize = letterSizes[rowIndex] || letterSizes[0];
              // Debug logging for the row
              console.log(
                `Current Row ${rowIndex}: LogMAR ${(
                  1.0 -
                  rowIndex * 0.1
                ).toFixed(1)}, Calculated Size: ${letterSize}px`
              );
              return (
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
                          <span
                            className={`letter ${item.status || ""}`}
                            style={{
                              fontSize: `${letterSize}px`,
                              lineHeight: `${letterSize}px`,
                            }}
                          >
                            {item.char}
                          </span>
                          {colIndex < NUM_LETTERS_PER_LINE - 1 && (
                            <span
                              className="spacer-char"
                              style={{
                                fontSize: `${letterSize}px`,
                                lineHeight: `${letterSize}px`,
                              }}
                            >
                              C
                            </span>
                          )}
                        </React.Fragment>
                      );
                    }
                  )}
                </div>
              );
            })()
          ) : (
            <div>Loading chart...</div> // Or any other loading indicator
          )}
        </div>
      </div>
    </div>
  );
};

export default LogMARChart;
