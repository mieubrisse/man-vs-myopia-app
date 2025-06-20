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

// Utility function to calculate the pixel size for a given LogMAR value
export function calculateLetterPixelSizeForLogMAR(
  desiredLogMAR: number,
  viewingDistanceCm: number,
  fontSizePxPerCm: number
): number {
  // Constants for LogMAR calculation
  const LOGMAR_1_0_ARC_MINUTES = 10; // 1.0 LogMAR = 10 arc minutes
  const LOGMAR_1_0_ANGLE_DEGREES = LOGMAR_1_0_ARC_MINUTES / 60; // Convert arc minutes to degrees
  const logmar1_0AngleRadians = (LOGMAR_1_0_ANGLE_DEGREES * Math.PI) / 180; // Convert degrees to radians
  // Calculate the height of 1.0 LogMAR characters using geometry
  // height = 2 * distance * tan(angle)
  const logmar1_0HeightCm =
    2 * viewingDistanceCm * Math.tan(logmar1_0AngleRadians);
  // Calculate the pixel size for 1.0 LogMAR letters
  const logmar1_0SizePx = logmar1_0HeightCm * fontSizePxPerCm;
  // Calculate the size ratio for the desired LogMAR
  const sizeRatio = Math.pow(10, desiredLogMAR - 1.0); // Correct geometric progression
  // Final pixel size for the desired LogMAR
  return Math.round(logmar1_0SizePx * sizeRatio);
}

const LogMARChart: React.FC<LogMARChartProps> = ({
  onLetterValidated,
  calibrationData,
  viewingConfiguration,
  onAssessmentComplete,
}) => {
  const SLOAN_LETTERS = ["C", "D", "H", "K", "N", "O", "R", "S", "V", "Z"];
  const NUM_LETTERS_PER_LINE = 5;
  const NUM_ROWS = 14;

  // Only keep state for the current row's letters and their statuses
  const [currentRowLetters, setCurrentRowLetters] = useState<LetterState[]>([]);
  const [currentLetterIndex, setCurrentLetterIndex] = useState(0);
  const [currentRow, setCurrentRow] = useState(0);
  const [isAssessmentFinished, setIsAssessmentFinished] = useState(false);
  const [debugInfo, setDebugInfo] = useState<DebugInfo[]>([]);
  const [score, setScore] = useState({
    correctLetters: 0,
    attemptedLetters: 0,
  });

  // Speech recognition state
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const currentLetterIndexRef = useRef<number>(0);
  const currentRowRef = useRef<number>(0);
  const isAssessmentFinishedRef = useRef<boolean>(false);

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

  // Helper to generate a row of random letters
  const generateRowLetters = useCallback((): LetterState[] => {
    const letters: LetterState[] = [];
    let lastLetter = "";

    for (let i = 0; i < NUM_LETTERS_PER_LINE; i++) {
      let availableLetters = SLOAN_LETTERS;

      // If this isn't the first letter, exclude the previous letter
      if (lastLetter) {
        availableLetters = SLOAN_LETTERS.filter(
          (letter) => letter !== lastLetter
        );
      }

      const randomIndex = Math.floor(Math.random() * availableLetters.length);
      const selectedLetter = availableLetters[randomIndex];

      letters.push({
        char: selectedLetter,
        status: "pending",
      });

      lastLetter = selectedLetter;
    }

    return letters;
  }, []);

  // Initialize the first row on mount
  useEffect(() => {
    setCurrentRowLetters((prev) => {
      if (prev.length === 0) {
        const row = generateRowLetters();
        row[0].status = "current";
        return row;
      }
      return prev;
    });
    setCurrentLetterIndex(0);
    setCurrentRow(0);
    setScore({ correctLetters: 0, attemptedLetters: 0 });
    setIsAssessmentFinished(false);
  }, [generateRowLetters]);

  // Update refs when state changes
  useEffect(() => {
    currentLetterIndexRef.current = currentLetterIndex;
    currentRowRef.current = currentRow;
    isAssessmentFinishedRef.current = isAssessmentFinished;
  }, [currentLetterIndex, currentRow, isAssessmentFinished]);

  // Handle finishing the assessment
  const finishAssessment = useCallback(() => {
    const { correctLetters, attemptedLetters } = score;
    const totalLetters = NUM_ROWS * NUM_LETTERS_PER_LINE;
    const logMARScore = 1.1 - correctLetters * 0.02;
    onAssessmentComplete?.({
      logMARScore,
      correctLetters,
      totalLetters,
      attemptedLetters,
    });
  }, [score, onAssessmentComplete]);

  // Store stable references to functions for use in event handlers
  const finishAssessmentRef = useRef(finishAssessment);
  const recognizeMilitaryAlphabetRef = useRef(recognizeMilitaryAlphabet);
  const onLetterValidatedRef = useRef(onLetterValidated);

  useEffect(() => {
    finishAssessmentRef.current = finishAssessment;
  }, [finishAssessment]);
  useEffect(() => {
    recognizeMilitaryAlphabetRef.current = recognizeMilitaryAlphabet;
  }, [recognizeMilitaryAlphabet]);
  useEffect(() => {
    onLetterValidatedRef.current = onLetterValidated;
  }, [onLetterValidated]);
  useEffect(() => {
    currentRowLettersRef.current = currentRowLetters;
  }, [currentRowLetters]);

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
        if (!isAssessmentFinishedRef.current && recognitionRef.current) {
          recognition.start();
        }
      };
      recognition.onresult = (event: SpeechRecognitionEvent) => {
        const result = event.results[event.results.length - 1];
        const fullTranscript = result[0].transcript;
        const confidence = result[0].confidence;
        const recognizedLetters =
          recognizeMilitaryAlphabetRef.current(fullTranscript);
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
        if (result.isFinal && recognizedLetters.length > 0) {
          let letterIndex = 0;
          const processNextLetter = () => {
            if (letterIndex >= recognizedLetters.length) return;
            const letter = recognizedLetters[letterIndex];
            if (letter === "FINISH") {
              setIsAssessmentFinished(true);
              finishAssessmentRef.current();
              if (recognitionRef.current) recognitionRef.current.stop();
              return;
            }
            const idx = currentLetterIndexRef.current;
            const rowLetters = currentRowLettersRef.current;
            setCurrentRowLetters((prev) => {
              if (idx >= prev.length) return prev;
              const isCorrect = letter === prev[idx].char;
              const updated = [...prev];
              updated[idx].status = isCorrect ? "correct" : "incorrect";
              if (idx + 1 < updated.length) {
                updated[idx + 1].status = "current";
              }
              return updated;
            });
            setScore((prev) => ({
              correctLetters:
                prev.correctLetters +
                (letter === rowLetters[idx]?.char ? 1 : 0),
              attemptedLetters: prev.attemptedLetters + 1,
            }));
            onLetterValidatedRef.current?.(letter === rowLetters[idx]?.char);
            setCurrentLetterIndex((prev) => prev + 1);
            letterIndex++;
            setTimeout(processNextLetter, 100);
          };
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
  }, []); // Only run once on mount

  // When a row is completed, advance to the next row
  useEffect(() => {
    if (
      currentRowLetters.length === NUM_LETTERS_PER_LINE &&
      currentRowLetters.every(
        (l) => l.status === "correct" || l.status === "incorrect"
      ) &&
      !isAssessmentFinished
    ) {
      if (currentRow < NUM_ROWS - 1) {
        const nextRow = generateRowLetters();
        nextRow[0].status = "current";
        setCurrentRowLetters(nextRow);
        setCurrentLetterIndex(0);
        setCurrentRow((prev) => prev + 1);
      } else {
        setIsAssessmentFinished(true);
        finishAssessment();
        if (recognitionRef.current) recognitionRef.current.stop();
      }
    }
  }, [
    currentRowLetters,
    isAssessmentFinished,
    currentRow,
    generateRowLetters,
    finishAssessment,
  ]);

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

    // Convert calibration data: measuredHeightPx = measuredHeightCm
    const pixelsPerCm =
      calibrationData.measuredHeightPx / calibrationData.measuredHeightCm;

    // Calculate sizes for all LogMAR levels (1.0 at top, decreasing by 0.1 per row)
    const letterSizes: number[] = [];
    for (let i = 0; i < NUM_ROWS; i++) {
      const logmarLevel = 1.0 - i * 0.1;
      const letterSizePx = calculateLetterPixelSizeForLogMAR(
        logmarLevel,
        viewingConfiguration.distanceCentimeters,
        pixelsPerCm
      );
      letterSizes.push(letterSizePx);
    }

    return letterSizes;
  }, [calibrationData, viewingConfiguration]);

  // Get letter sizes for the chart
  const letterSizes = calculateLetterSizes();

  // Add this ref for currentRowLetters
  const currentRowLettersRef = useRef<LetterState[]>([]);

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
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          {currentRowLetters.length > 0 && letterSizes ? (
            (() => {
              const rowIndex = currentRow;
              const letterSize = letterSizes[rowIndex] || letterSizes[0];
              return (
                <div
                  key={rowIndex}
                  className="chart-row"
                  style={{ "--row-index": rowIndex } as React.CSSProperties}
                >
                  {currentRowLetters.map((item, colIndex) => (
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
                  ))}
                </div>
              );
            })()
          ) : (
            <div>Loading chart...</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LogMARChart;
