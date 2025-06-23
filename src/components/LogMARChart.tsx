import React, { useEffect, useState, useRef, useCallback } from "react";
import "./LogMARChart.css";
import { LandoltCOptotype } from "./LandoltCOptotype";
import { UserLogMARGuessingEngine } from "../lib/UserLogMARGuessingEngine";
import AlphaProbabilityGraph from "./AlphaProbabilityGraph";
import ResponseIndicator from "./ResponseIndicator";
import ConfidenceProgress from "./ConfidenceProgress";

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
  lineNumber: number;
  transcript: string;
  confidence: number;
  utterance: string | null;
  timestamp: number;
  isFinal: boolean;
}

interface TopPanelDebugInfo {
  nextTrialLogMAR: number;
  guessedLogMAR: number;
  intervalLowerBound: number;
  intervalUpperBound: number;
  confidenceIntervalWidth: number;
}

interface LetterState {
  orientation: string;
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
  guessingEngine: UserLogMARGuessingEngine;
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
  if (viewingDistanceCm === 0) {
    throw new Error("viewingDistanceCm must be nonzero");
  }
  if (fontSizePxPerCm === 0) {
    throw new Error("fontSizePxPerCm must be nonzero");
  }
  // Step 1: Convert LogMAR to MAR (Minimum Angle of Resolution, in arcminutes)
  const MAR = Math.pow(10, desiredLogMAR); // MAR in arcminutes
  // Step 2: Letter height subtends 5 x MAR
  const letterAngleArcmin = 5 * MAR;
  // Step 3: Convert angle to degrees and then radians
  const angleDegrees = letterAngleArcmin / 60; // 1 degree = 60 arcminutes
  const angleRadians = (angleDegrees * Math.PI) / 180;
  // Step 4: Calculate the height in cm using geometry
  // height = 2 * distance * tan(angle/2)
  const heightCm = 2 * viewingDistanceCm * Math.tan(angleRadians / 2);
  // Step 5: Convert to pixels
  const heightPx = heightCm * fontSizePxPerCm;
  return Math.round(heightPx);
}

/*
WHAT CHATGPT HAS TO SAY ABOUT LOGMAR CONFIDENCE INTERVALS:

Because the natural repeatability floor of a paper ETDRS is already ± 0.15 logMAR, any algorithm that
tightens the credible interval width to ≤ 0.10 logMAR is unequivocally more precise than standard care.
Going down to ± 0.05 logMAR buys you a factor-of-three margin over the paper chart's noise—very useful for:
•	Detecting modest disease progression early (e.g., −0.08 logMAR change).
•	Reducing sample size in trials that use acuity as an endpoint.
•	Giving home users feedback sensitive enough to see day-to-day fluctuations.

Trade-off rule of thumb
  •	Halving the confidence interval width roughly doubles the number of informative trials once you're below ± 0.10 logMAR.
  •	Below ± 0.03 logMAR the benefit/effort curve flattens; observer variability (blinks, attention) dominates.
*/
const TARGET_CONFIDENCE_INTERVAL_WIDTH = 0.05;

const LogMARChart: React.FC<LogMARChartProps> = ({
  onLetterValidated,
  calibrationData,
  viewingConfiguration,
  onAssessmentComplete,
  guessingEngine,
}) => {
  const LANDOLT_C_ORIENTATIONS = [
    "NORTH",
    "NORTHEAST",
    "EAST",
    "SOUTHEAST",
    "SOUTH",
    "SOUTHWEST",
    "WEST",
    "NORTHWEST",
  ];
  const NUM_LETTERS_PER_LINE = 3;
  const STARTING_LOGMAR = 0.4;

  // Only keep state for the current row's letters and their statuses
  const [currentRowLetters, setCurrentRowLetters] = useState<LetterState[]>([]);
  const [currentLetterIndex, setCurrentLetterIndex] = useState(0);
  const [currentLogMAR, setCurrentLogMAR] = useState(STARTING_LOGMAR);
  const [isAssessmentFinished, setIsAssessmentFinished] = useState(false);
  const [debugInfo, setDebugInfo] = useState<DebugInfo[]>([]);
  const [topPanelDebugInfo, setTopPanelDebugInfo] = useState<TopPanelDebugInfo | null>(null);
  const [alphaProbabilities, setAlphaProbabilities] = useState<
    { logMAR: number; probability: number }[]
  >([]);
  const [initialConfidenceWidth, setInitialConfidenceWidth] = useState<number | null>(null);

  // Track scores for each LogMAR value: Map<LogMAR, {attempted: number, correct: number}>
  const [logMARScoreMap, setLogMARScoreMap] = useState<
    Map<number, { attempted: number; correct: number }>
  >(new Map());

  // Speech recognition state
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const currentLetterIndexRef = useRef<number>(0);
  const currentLogMARRef = useRef<number>(STARTING_LOGMAR);
  const isAssessmentFinishedRef = useRef<boolean>(false);
  const speechEventCounterRef = useRef<number>(1);

  // Military alphabet mappings only
  // const MILITARY_ALPHABET_MAPPINGS: { [key: string]: string } = {
  //   ALPHA: "A",
  //   BRAVO: "B",
  //   CHARLIE: "C",
  //   "CHARLIE'S": "C",
  //   DELTA: "D",
  //   ECHO: "E",
  //   FOXTROT: "F",
  //   GOLF: "G",
  //   HOTEL: "H",
  //   INDIA: "I",
  //   JULIET: "J",
  //   KILO: "K",
  //   LIMA: "L",
  //   MIKE: "M",
  //   NOVEMBER: "N",
  //   OSCAR: "O",
  //   PAPA: "P",
  //   QUEBEC: "Q",
  //   ROMEO: "R",
  //   SIERRA: "S",
  //   CIARA: "S",
  //   TANGO: "T",
  //   UNIFORM: "U",
  //   VICTOR: "V",
  //   WHISKEY: "W",
  //   XRAY: "X",
  //   YANKEE: "Y",
  //   ZULU: "Z",
  //   FINISH: "FINISH",
  // };

  const ORIENTATION_MAPPINGS: { [key: string]: string } = {
    NORTH: "NORTH",
    NORTHEAST: "NORTHEAST",
    EAST: "EAST",
    SOUTHEAST: "SOUTHEAST",
    SOUTH: "SOUTH",
    SOUTHWEST: "SOUTHWEST",
    WEST: "WEST",
    NORTHWEST: "NORTHWEST",
    FINISH: "FINISH",
  };

  // Helper function to convert spoken words to orientations
  const recognizeOrientation = (transcript: string): string[] => {
    const words = transcript.trim().toUpperCase().split(/\s+/);
    const recognizedOrientations: string[] = [];

    for (const word of words) {
      const trimmedWord = word.trim();
      const orientation = ORIENTATION_MAPPINGS[trimmedWord];

      if (orientation) {
        recognizedOrientations.push(orientation);
      }
    }

    return recognizedOrientations;
  };

  // Helper to generate a row of random letters
  const generateRowLetters = useCallback((): LetterState[] => {
    const orientations: LetterState[] = [];

    for (let i = 0; i < NUM_LETTERS_PER_LINE; i++) {
      const availableOrientations = LANDOLT_C_ORIENTATIONS;

      const randomIndex = Math.floor(Math.random() * availableOrientations.length);
      const selectedOrientation = availableOrientations[randomIndex];

      orientations.push({
        orientation: selectedOrientation,
        status: "pending",
      });
    }

    return orientations;
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
    setCurrentLogMAR(STARTING_LOGMAR);
    setIsAssessmentFinished(false);
  }, [generateRowLetters]);

  // Update refs when state changes
  useEffect(() => {
    currentLetterIndexRef.current = currentLetterIndex;
    currentLogMARRef.current = currentLogMAR;
    isAssessmentFinishedRef.current = isAssessmentFinished;
  }, [currentLetterIndex, currentLogMAR, isAssessmentFinished]);

  useEffect(() => {
    if (guessingEngine) {
      const initialProbs = Array.from(guessingEngine.getAlphaProbabilities().entries()).map(
        ([logMAR, probability]) => ({ logMAR, probability })
      );
      setAlphaProbabilities(initialProbs);

      const { intervalLowerBound, intervalUpperBound } = guessingEngine.guessUserLogMAR();
      setInitialConfidenceWidth(intervalUpperBound - intervalLowerBound);
    }
  }, [guessingEngine]);

  // Handle finishing the assessment
  const finishAssessment = useCallback(() => {
    let totalCorrect = 0;
    let totalAttempted = 0;

    for (const [, scores] of logMARScoreMap) {
      totalCorrect += scores.correct;
      totalAttempted += scores.attempted;
    }

    const finalLogMARScore = guessingEngine.guessUserLogMAR().guessedLogMAR;

    onAssessmentComplete?.({
      logMARScore: finalLogMARScore,
      correctLetters: totalCorrect,
      totalLetters: totalAttempted,
      attemptedLetters: totalAttempted,
    });
  }, [logMARScoreMap, onAssessmentComplete, guessingEngine]);

  // Store stable references to functions for use in event handlers
  const finishAssessmentRef = useRef(finishAssessment);
  const recognizeOrientationRef = useRef(recognizeOrientation);
  const onLetterValidatedRef = useRef(onLetterValidated);

  useEffect(() => {
    finishAssessmentRef.current = finishAssessment;
  }, [finishAssessment]);
  useEffect(() => {
    recognizeOrientationRef.current = recognizeOrientation;
  }, [recognizeOrientation]);
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
        const recognizedOrientations = recognizeOrientationRef.current(fullTranscript);
        setDebugInfo((prev) => {
          const newInfo = {
            lineNumber: speechEventCounterRef.current,
            transcript: fullTranscript,
            confidence,
            utterance: recognizedOrientations.length > 0 ? recognizedOrientations.join(", ") : null,
            timestamp: Date.now(),
            isFinal: result.isFinal,
          };
          speechEventCounterRef.current += 1;
          return [...prev, newInfo].slice(-4);
        });
        if (result.isFinal && recognizedOrientations.length > 0) {
          let letterIndex = 0;
          const processNextLetter = () => {
            if (letterIndex >= recognizedOrientations.length) return;
            const orientation = recognizedOrientations[letterIndex];
            if (orientation === "FINISH") {
              setIsAssessmentFinished(true);
              finishAssessmentRef.current();
              if (recognitionRef.current) recognitionRef.current.stop();
              return;
            }
            const idx = currentLetterIndexRef.current;
            const rowLetters = currentRowLettersRef.current;
            const currentLetter = rowLetters[idx];
            if (!currentLetter) return;

            const isCorrect = orientation === currentLetter.orientation;

            // Update the guessing engine in the background
            guessingEngine.updateGivenTrialResult(currentLogMARRef.current, isCorrect);
            const { guessedLogMAR, intervalLowerBound, intervalUpperBound } =
              guessingEngine.guessUserLogMAR();
            const nextTrialLogMAR = guessingEngine.proposeNextTrialLogMAR();
            const currentProbs = Array.from(guessingEngine.getAlphaProbabilities().entries()).map(
              ([logMAR, probability]) => ({ logMAR, probability })
            );
            const confidenceIntervalWidth = intervalUpperBound - intervalLowerBound;

            setTopPanelDebugInfo({
              guessedLogMAR,
              intervalLowerBound,
              intervalUpperBound,
              nextTrialLogMAR,
              confidenceIntervalWidth,
            });
            setAlphaProbabilities(currentProbs);

            setCurrentRowLetters((prev) => {
              if (idx >= prev.length) return prev;
              const updated = [...prev];
              updated[idx].status = isCorrect ? "correct" : "incorrect";
              if (idx + 1 < updated.length) {
                updated[idx + 1].status = "current";
              }
              return updated;
            });

            // Update the score map
            setLogMARScoreMap((prev) => {
              const newMap = new Map(prev);
              const currentScores = newMap.get(currentLogMARRef.current) || {
                attempted: 0,
                correct: 0,
              };
              newMap.set(currentLogMARRef.current, {
                attempted: currentScores.attempted + 1,
                correct: currentScores.correct + (isCorrect ? 1 : 0),
              });
              return newMap;
            });

            onLetterValidatedRef.current?.(isCorrect);
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
      currentRowLetters.every((l) => l.status === "correct" || l.status === "incorrect") &&
      !isAssessmentFinished
    ) {
      const { intervalLowerBound, intervalUpperBound } = guessingEngine.guessUserLogMAR();
      const confidenceIntervalWidth = intervalUpperBound - intervalLowerBound;

      if (confidenceIntervalWidth <= TARGET_CONFIDENCE_INTERVAL_WIDTH) {
        setIsAssessmentFinished(true);
        finishAssessment();
        if (recognitionRef.current) recognitionRef.current.stop();
        return;
      }

      const nextLogMAR = guessingEngine.proposeNextTrialLogMAR();

      setCurrentLogMAR(nextLogMAR);
      const nextRow = generateRowLetters();
      nextRow[0].status = "current";
      setCurrentRowLetters(nextRow);
      setCurrentLetterIndex(0);
    }
  }, [
    currentRowLetters,
    isAssessmentFinished,
    generateRowLetters,
    finishAssessment,
    guessingEngine,
  ]);

  // Log calibration and viewing configuration data when component mounts
  useEffect(() => {
    console.log("=== Assessment Configuration ===");

    if (calibrationData) {
      console.log("Font Size Calibration:");
      console.log("  - Measured height (px):", calibrationData.measuredHeightPx);
      console.log("  - Measured height (cm):", calibrationData.measuredHeightCm);
    } else {
      console.log("Font Size Calibration: Not available");
    }

    if (viewingConfiguration) {
      console.log("Viewing Configuration:");
      console.log("  - UUID:", viewingConfiguration.id);
      console.log("  - Name:", viewingConfiguration.name);
      console.log("  - Distance:", viewingConfiguration.distanceCentimeters, "cm from screen");
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
    const pixelsPerCm = calibrationData.measuredHeightPx / calibrationData.measuredHeightCm;

    // Calculate size for the current LogMAR level
    const letterSizePx = calculateLetterPixelSizeForLogMAR(
      currentLogMAR,
      viewingConfiguration.distanceCentimeters,
      pixelsPerCm
    );

    return letterSizePx;
  }, [calibrationData, viewingConfiguration, currentLogMAR]);

  // Get letter size for the chart
  const letterSize = calculateLetterSizes();

  // Add this ref for currentRowLetters
  const currentRowLettersRef = useRef<LetterState[]>([]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        width: "100vw",
        height: "100vh",
        margin: 0,
        padding: 0,
        boxSizing: "border-box",
      }}
    >
      {/* Speech Recognition Debug Info (fixed at top) */}
      <div
        style={{
          width: "100%",
          zIndex: 1000,
          padding: "1rem",
          backgroundColor: "#f0f0f0",
          borderBottom: "2px solid #ccc",
          fontFamily: "monospace",
          fontSize: "1rem",
          height: "20vh",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div style={{ display: "flex", flexDirection: "row", flex: 1 }}>
          <div style={{ flex: 1, paddingRight: "1rem" }}>
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
              debugInfo.map((info) => (
                <div
                  key={info.timestamp}
                  style={{
                    marginBottom: "0.5rem",
                    padding: "0.25rem",
                    backgroundColor:
                      info.lineNumber === speechEventCounterRef.current - 1
                        ? "#e0e0e0"
                        : "transparent",
                  }}
                >
                  {`[${info.lineNumber}] "${info.transcript}" (${(info.confidence * 100).toFixed(
                    1
                  )}% confidence)`}
                  {info.utterance && ` → Detected utterance: "${info.utterance}"`}
                  {!info.isFinal && " (interim)"}
                </div>
              ))
            )}
          </div>

          {/* New pane for guessing engine */}
          <div
            style={{
              flex: 1,
              paddingLeft: "1rem",
              borderLeft: "1px solid #ccc",
            }}
          >
            <div
              style={{
                fontWeight: "bold",
                fontSize: "1.1rem",
                marginBottom: "0.5rem",
              }}
            >
              Guessing Engine State:
            </div>
            {topPanelDebugInfo ? (
              <div>
                <div>{`Next trial proposal: ${topPanelDebugInfo.nextTrialLogMAR.toFixed(
                  3
                )} LogMAR`}</div>
                <div>{`Current acuity guess: ${topPanelDebugInfo.guessedLogMAR.toFixed(
                  3
                )} LogMAR`}</div>
                <div>{`Confidence Interval: [${topPanelDebugInfo.intervalLowerBound.toFixed(
                  3
                )}, ${topPanelDebugInfo.intervalUpperBound.toFixed(
                  3
                )}] (width: ${topPanelDebugInfo.confidenceIntervalWidth.toFixed(3)})`}</div>
              </div>
            ) : (
              <div>Awaiting first result...</div>
            )}
          </div>
        </div>
        <div
          style={{
            paddingTop: "1rem",
            marginTop: "1rem",
            borderTop: "1px solid #ccc",
            textAlign: "center",
            fontWeight: "bold",
          }}
        >
          {`Current row LogMAR: ${currentLogMAR.toFixed(3)}`}
        </div>
      </div>
      {/* Centered chart row below debug box */}
      <div
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "row",
          justifyContent: "center",
          width: "100%",
          height: "55vh",
        }}
      >
        <div style={{ padding: "1rem" }}>
          <ResponseIndicator responses={currentLetterIndex} total={NUM_LETTERS_PER_LINE} />
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            flex: 1,
          }}
        >
          {currentRowLetters.length > 0 && letterSize ? (
            (() => {
              return (
                <div
                  key={currentLogMAR}
                  className="chart-row"
                  style={{ "--row-index": currentLogMAR } as React.CSSProperties}
                >
                  {currentRowLetters.map((item, colIndex) => (
                    <React.Fragment key={colIndex}>
                      <div
                        className={`letter ${item.status || ""}`}
                        style={{
                          width: `${letterSize}px`,
                          height: `${letterSize}px`,
                        }}
                      >
                        <LandoltCOptotype
                          orientation={
                            item.orientation as
                              | "NORTH"
                              | "NORTHEAST"
                              | "EAST"
                              | "SOUTHEAST"
                              | "SOUTH"
                              | "SOUTHWEST"
                              | "WEST"
                              | "NORTHWEST"
                          }
                        />
                      </div>

                      {colIndex < NUM_LETTERS_PER_LINE - 1 && (
                        <div
                          className="spacer"
                          style={{
                            width: `${letterSize}px`,
                            height: `${letterSize}px`,
                            visibility: "hidden",
                          }}
                        >
                          <LandoltCOptotype orientation="NORTH" />
                        </div>
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
        <div style={{ padding: "1rem" }}>
          <ConfidenceProgress
            progress={
              topPanelDebugInfo && initialConfidenceWidth
                ? 1 -
                  (Math.log(topPanelDebugInfo.confidenceIntervalWidth) -
                    Math.log(TARGET_CONFIDENCE_INTERVAL_WIDTH)) /
                    (Math.log(initialConfidenceWidth) - Math.log(TARGET_CONFIDENCE_INTERVAL_WIDTH))
                : 0
            }
          />
        </div>
      </div>
      {alphaProbabilities.length > 0 && (
        <div
          style={{
            width: "100%",
            backgroundColor: "#f0f0f0",
            borderTop: "2px solid #ccc",
            zIndex: 1000,
            height: "25vh",
          }}
        >
          <AlphaProbabilityGraph data={alphaProbabilities} />
        </div>
      )}
    </div>
  );
};

export default LogMARChart;
