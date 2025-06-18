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
  measuredHeightMm: number;
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

  // Speech recognition state
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const [debugInfo, setDebugInfo] = useState<DebugInfo[]>([]);
  const [isAssessmentFinished, setIsAssessmentFinished] = useState(false);

  // Use refs to store current state to avoid stale closures
  const currentIndexRef = useRef<number>(0);
  const allLettersRef = useRef<LetterState[]>([]);

  // Military alphabet mappings only
  const MILITARY_ALPHABET_MAPPINGS: { [key: string]: string } = {
    ALPHA: "A",
    BRAVO: "B",
    CHARLIE: "C",
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

          // Process each recognized letter sequentially
          const processNextLetter = (letterIndex: number) => {
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
              return; // Exit early if FINISH is detected
            } else {
              // Process letter guess
              const currentIndex = currentIndexRef.current;
              const allLetters = allLettersRef.current;

              console.log(
                "Processing letter guess:",
                letter,
                "current index:",
                currentIndex,
                "letter index in batch:",
                letterIndex
              );

              if (currentIndex < allLetters.length) {
                const currentLetterState = allLetters[currentIndex];
                const isCorrect = letter === currentLetterState.char;

                console.log("Letter comparison:", {
                  guessed: letter,
                  actual: currentLetterState.char,
                  isCorrect,
                });

                // Update the letter state
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
                    setCurrentIndex(newAllLetters.length); // Set to end to prevent further processing
                    return newAllLetters;
                  }

                  // Mark the next letter as current
                  newAllLetters[nextIndex].status = "current";
                  console.log("Next index set to:", nextIndex);

                  setCurrentIndex(nextIndex); // Update the main index state

                  return newAllLetters;
                });

                onLetterValidated?.(isCorrect);

                // Process the next letter after a short delay to allow state to update
                setTimeout(() => {
                  processNextLetter(letterIndex + 1);
                }, 100);
              }
            }
          };

          // Start processing from the first letter
          processNextLetter(0);
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
        (calibrationData.measuredHeightMm / 10).toFixed(1)
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

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        alignItems: "flex-start",
        width: "100%",
        gap: "2rem",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          flex: "1",
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

      {/* Speech Recognition Debug Info */}
      <div
        style={{
          flex: "0 0 400px",
          padding: "1rem",
          backgroundColor: "#f0f0f0",
          borderRadius: "4px",
          fontFamily: "monospace",
          fontSize: "1rem",
          border: "2px solid #ccc",
          maxHeight: "80vh",
          overflowY: "auto",
          position: "sticky",
          top: "2rem",
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
    </div>
  );
};

export default LogMARChart;
