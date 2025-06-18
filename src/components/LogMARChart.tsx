import React, { useEffect, useState, useRef } from "react";
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

  // Common ways people might say each letter or command
  const RECOGNIZED_UTTERANCE_MAPPINGS: { [key: string]: string[] } = {
    C: ["C", "SEE", "SEA", "CEE", "CHARLIE"],
    D: ["D", "DEE", "DE", "DELTA"],
    H: ["H", "AITCH", "HATCH", "HOTEL"],
    K: ["K", "KAY", "KAYE", "OKAY", "KILO", "HILO"],
    N: ["N", "EN", "END", "NOVEMBER"],
    O: ["O", "OH", "ZERO", "0", "OSCAR"],
    R: ["R", "ARE", "OUR", "ARR", "ROMEO"],
    S: ["S", "ESS", "ES", "US", "SIERRA"],
    V: ["V", "VEE", "VIE", "VICTOR"],
    Z: ["Z", "ZEE", "ZED", "ZIE", "ZULU"],
    FINISH: ["FINISH", "FINISHED"],
  };

  // Helper function to convert a transcript to an utterance
  const recognizeUtterance = (transcript: string): string | null => {
    const upperTranscript = transcript.trim().toUpperCase();

    // Check each utterance's possible phrases
    for (const [recognizedUtterance, phrases] of Object.entries(
      RECOGNIZED_UTTERANCE_MAPPINGS
    )) {
      if (phrases.some((phrase) => upperTranscript === phrase)) {
        return recognizedUtterance;
      }
    }

    return upperTranscript;
  };

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

        // Split the transcript into words and take the last one
        const words = fullTranscript.trim().split(" ");
        const lastWord = words[words.length - 1];

        const confidence = result[0].confidence;
        const utterance = recognizeUtterance(lastWord); // Pass only the last word to transcriptToUtterance

        // Update debug info for all results
        setDebugInfo((prev) => {
          const newInfo = {
            transcript: fullTranscript,
            confidence,
            utterance: utterance,
            timestamp: Date.now(),
            isFinal: result.isFinal,
          };
          return [...prev, newInfo].slice(-5);
        });

        // Process interim results with sufficient confidence
        console.log("Speech recognition result:", {
          isFinal: result.isFinal,
          confidence,
          utterance: utterance,
        });

        if (result.isFinal && utterance) {
          console.log("About to call guessLetter with:", utterance);
          if (utterance === "FINISH") {
            setIsAssessmentFinished(true);
            finishAssessment();
            // Stop the recognition engine when assessment is finished
            if (recognitionRef.current) {
              recognitionRef.current.stop();
            }
          } else {
            guessLetter(utterance);
          }
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
  }, []);

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
    const attemptedLetters = allLetters.filter(
      (letter) => letter.status === "correct" || letter.status === "incorrect"
    ).length;
    const totalLetters = allLetters.length;
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
                  const itemIndex = rowIndex * NUM_LETTERS_PER_LINE + colIndex;
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

      {/* Speech Recognition Debug Info */}
      <div
        style={{
          marginTop: "2rem",
          marginBottom: "1rem",
          padding: "1rem",
          backgroundColor: "#f0f0f0",
          borderRadius: "4px",
          fontFamily: "monospace",
          fontSize: "1rem",
          border: "2px solid #ccc",
          width: "80%",
          maxWidth: "600px",
          margin: "1rem auto",
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
