import React, { useEffect, useState, useRef, useCallback } from "react";
import "./LogMARChart.css";
import { LandoltCOptotype } from "./LandoltCOptotype";
import { UserLogMARGuessingEngine } from "../lib/UserLogMARGuessingEngine";
import AlphaProbabilityGraph, { type ProbabilityGraphDatapoint } from "./AlphaProbabilityGraph";
import ResponseIndicator from "./ResponseIndicator";
import ConfidenceProgress from "./ConfidenceProgress";
import { calculateLogisticPsychometric } from "../lib/UserLogMARGuessingEngine";
import type { Eye } from "../lib/EyeDataStorage";

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
  pixelsPerCm: number;
}

interface ViewingConfiguration {
  id: string;
  name: string;
  distanceCentimeters: number;
}

interface FinalSpeechDebugRow {
  guessNumber: number;
  logMAR: number;
  transcript: string;
  correctness: "CORRECT" | "INCORRECT";
  acuityGuess: number;
  nextProposal: number;
  ciLower: number;
  ciUpper: number;
  ciWidth: number;
  totalCorrect: number;
}

interface LogMARChartProps {
  onLetterValidated?: (isCorrect: boolean) => void;
  calibrationData?: CalibrationData | null;
  viewingConfiguration?: ViewingConfiguration | null;
  guessingEngine: UserLogMARGuessingEngine;
  currentEye: Eye;
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

// Homophone mappings for common misrecognitions
const HOMOPHONE_MAPPINGS: { [key: string]: string } = {
  CELL: "SOUTH",
  SELF: "SOUTH",
  SO: "SOUTH",
  QUEST: "WEST",
  // Add more as needed
};

const LogMARChart: React.FC<LogMARChartProps> = ({
  onLetterValidated,
  calibrationData,
  viewingConfiguration,
  onAssessmentComplete,
  guessingEngine,
  currentEye,
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

  // Get optimal starting LogMAR from the guessing engine
  const startingLogMAR = guessingEngine.proposeNextTrialLogMAR();

  // Only keep state for the current row's letters and their statuses
  const [currentRowLetters, setCurrentRowLetters] = useState<LetterState[]>([]);
  const [currentLetterIndex, setCurrentLetterIndex] = useState(0);
  const [currentLogMAR, setCurrentLogMAR] = useState(startingLogMAR);
  const [isAssessmentFinished, setIsAssessmentFinished] = useState(false);
  const [topPanelDebugInfo, setTopPanelDebugInfo] = useState<TopPanelDebugInfo | null>(null);
  const [initialConfidenceWidth, setInitialConfidenceWidth] = useState<number | null>(null);

  // Track scores for each LogMAR value: Map<LogMAR, {attempted: number, correct: number}>
  const [logMARScoreMap, setLogMARScoreMap] = useState<
    Map<number, { attempted: number; correct: number }>
  >(new Map());

  // Speech recognition state
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const currentLetterIndexRef = useRef<number>(0);
  const currentLogMARRef = useRef<number>(startingLogMAR);
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
      // First check homophones
      const mapped = HOMOPHONE_MAPPINGS[trimmedWord] || ORIENTATION_MAPPINGS[trimmedWord];
      if (mapped) {
        recognizedOrientations.push(mapped);
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
    setCurrentLogMAR(startingLogMAR);
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
      // Add grammar for Landolt C directions
      const grammarWords = [
        "NORTH",
        "NORTHEAST",
        "EAST",
        "SOUTHEAST",
        "SOUTH",
        "SOUTHWEST",
        "WEST",
        "NORTHWEST",
        "FINISH",
      ];
      const grammar =
        "#JSGF V1.0; grammar directions; public <direction> = " + grammarWords.join(" | ") + " ;";
      console.log(`Adding grammar: ${grammar}`);
      const SpeechGrammarListCtor = window.SpeechGrammarList || window.webkitSpeechGrammarList;
      if (!SpeechGrammarListCtor) {
        throw new Error("SpeechGrammarList is not supported in this browser.");
      }
      const speechRecognitionList: SpeechGrammarList = new SpeechGrammarListCtor();
      speechRecognitionList.addFromString(grammar, 100); // Use 100 to force the recognition to strongly favor our stuff

      const recognition = new window.webkitSpeechRecognition();
      recognition.grammars = speechRecognitionList;
      recognition.continuous = false;
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
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const result = event.results[i];

          // Note to self: the reason we index into "result" is because result is
          // itself an array of alternatives on what the speech API thinks the user
          // said, sorted from most likely to least likely
          const fullTranscript = result[0].transcript;
          const recognizedOrientations = recognizeOrientationRef.current(fullTranscript);

          if (result.isFinal && recognizedOrientations.length > 0) {
            speechEventCounterRef.current += 1;
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
              const confidenceIntervalWidth = intervalUpperBound - intervalLowerBound;
              const nextTrialLogMAR = guessingEngine.proposeNextTrialLogMAR();

              setTopPanelDebugInfo({
                guessedLogMAR,
                intervalLowerBound,
                intervalUpperBound,
                nextTrialLogMAR,
                confidenceIntervalWidth,
              });

              if (isCorrect) totalCorrectRef.current += 1;
              const newRow: FinalSpeechDebugRow = {
                guessNumber: guessCounterRef.current++,
                logMAR: currentLogMARRef.current,
                transcript: orientation,
                correctness: (isCorrect ? "CORRECT" : "INCORRECT") as "CORRECT" | "INCORRECT",
                acuityGuess: guessedLogMAR,
                nextProposal: nextTrialLogMAR,
                ciLower: intervalLowerBound,
                ciUpper: intervalUpperBound,
                ciWidth: confidenceIntervalWidth,
                totalCorrect: totalCorrectRef.current,
              };
              setSpeechDebugRows((prev) => {
                const updated = [newRow, ...prev];
                return updated.sort((a, b) => a.guessNumber - b.guessNumber).slice(-4); // Show only the last 4 guesses, ascending order
              });
              setAllSpeechDebugRows((prev) => [...prev, newRow]);

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
          setLastHeardTranscript({ transcript: fullTranscript, isFinal: result.isFinal });
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
      console.log("  - Pixels per cm:", calibrationData.pixelsPerCm);
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

    // Calculate size for the current LogMAR level using pixels per cm directly
    const letterSizePx = calculateLetterPixelSizeForLogMAR(
      currentLogMAR,
      viewingConfiguration.distanceCentimeters,
      calibrationData.pixelsPerCm
    );

    return letterSizePx;
  }, [calibrationData, viewingConfiguration, currentLogMAR]);

  // Get letter size for the chart
  const letterSize = calculateLetterSizes();

  // Add this ref for currentRowLetters
  const currentRowLettersRef = useRef<LetterState[]>([]);

  const [speechDebugRows, setSpeechDebugRows] = useState<FinalSpeechDebugRow[]>([]);
  const [allSpeechDebugRows, setAllSpeechDebugRows] = useState<FinalSpeechDebugRow[]>([]);
  const totalCorrectRef = useRef(0);
  const guessCounterRef = useRef(1);
  const [lastHeardTranscript, setLastHeardTranscript] = useState<{
    transcript: string;
    isFinal: boolean;
  }>({ transcript: "", isFinal: false });

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
      {/* Top debug panel: only the speech recognition results table */}
      <div
        style={{
          width: "100%",
          zIndex: 1000,
          padding: "0 1rem 1rem 1rem",
          backgroundColor: "#f0f0f0",
          borderBottom: "2px solid #ccc",
          fontFamily: "monospace",
          fontSize: "1rem",
          height: "20vh",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          position: "relative",
        }}
      >
        {/* Banner for last heard transcript */}
        <div
          style={{
            background: "#e0e7ff",
            color: "#1e293b",
            padding: "0.2em 1em",
            borderRadius: "6px",
            marginTop: 0,
            marginBottom: "0.75em",
            fontWeight: 600,
            fontSize: "1rem",
            minHeight: "2.2em",
            display: "flex",
            alignItems: "center",
          }}
        >
          {lastHeardTranscript.transcript
            ? `Heard: "${lastHeardTranscript.transcript}" (${
                lastHeardTranscript.isFinal ? "final" : "interim"
              })`
            : "Waiting for speech..."}
        </div>
        {/* Debug table, no title */}
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", paddingRight: "1em" }}>#</th>
                <th style={{ textAlign: "left", paddingRight: "1em" }}>LogMAR</th>
                <th style={{ textAlign: "left", paddingRight: "1em" }}>Transcript</th>
                <th style={{ textAlign: "left", paddingRight: "1em" }}>Result</th>
                <th style={{ textAlign: "left", paddingRight: "1em" }}>Acuity Guess</th>
                <th style={{ textAlign: "left", paddingRight: "1em" }}>Next Proposal</th>
                <th style={{ textAlign: "left", paddingRight: "1em" }}>CI Lower</th>
                <th style={{ textAlign: "left", paddingRight: "1em" }}>CI Upper</th>
                <th style={{ textAlign: "left", paddingRight: "1em" }}>CI Width</th>
                <th style={{ textAlign: "left", paddingRight: "1em" }}>Hit Rate</th>
              </tr>
            </thead>
            <tbody>
              {speechDebugRows.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ color: "#666" }}>
                    No results yet...
                  </td>
                </tr>
              ) : (
                speechDebugRows.map((row) => (
                  <tr key={row.guessNumber}>
                    <td>{row.guessNumber}</td>
                    <td>{row.logMAR.toFixed(3)}</td>
                    <td>{row.transcript}</td>
                    <td style={{ color: row.correctness === "CORRECT" ? "#16a34a" : "#dc2626" }}>
                      {row.correctness}
                    </td>
                    <td>{row.acuityGuess.toFixed(3)}</td>
                    <td>{row.nextProposal.toFixed(3)}</td>
                    <td>{row.ciLower.toFixed(3)}</td>
                    <td>{row.ciUpper.toFixed(3)}</td>
                    <td>{row.ciWidth.toFixed(3)}</td>
                    <td>{`${row.totalCorrect} / ${row.guessNumber}`}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {/* Copy CSV button */}
        <button
          onClick={() => {
            const header = [
              "#",
              "LogMAR",
              "Transcript",
              "Result",
              "Acuity Guess",
              "Next Proposal",
              "CI Lower",
              "CI Upper",
              "CI Width",
              "Hit Rate",
            ];
            const rows = allSpeechDebugRows.map((row) => [
              row.guessNumber,
              row.logMAR,
              row.transcript,
              row.correctness,
              row.acuityGuess,
              row.nextProposal,
              row.ciLower,
              row.ciUpper,
              row.ciWidth,
              `${row.totalCorrect} / ${row.guessNumber}`,
            ]);
            const csv = [header, ...rows]
              .map((r) => r.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(","))
              .join("\n");
            navigator.clipboard.writeText(csv);
          }}
          style={{
            position: "absolute",
            bottom: 8,
            right: 16,
            fontSize: "0.85em",
            padding: "0.25em 0.7em",
            borderRadius: "4px",
            border: "1px solid #bbb",
            background: "#f8fafc",
            color: "#334155",
            cursor: "pointer",
            opacity: 0.7,
            transition: "opacity 0.2s, background 0.1s",
            zIndex: 10,
          }}
          title="Copy all debug rows as CSV"
          onMouseOver={(e) => (e.currentTarget.style.opacity = "1")}
          onMouseOut={(e) => (e.currentTarget.style.opacity = "0.7")}
          onMouseDown={(e) => (e.currentTarget.style.background = "#dbeafe")}
          onMouseUp={(e) => (e.currentTarget.style.background = "#f8fafc")}
          onBlur={(e) => (e.currentTarget.style.background = "#f8fafc")}
        >
          Copy CSV
        </button>
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
        <div
          style={{
            padding: "1rem",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          {/* Show current LogMAR above the progress boxes */}
          <div
            style={{
              marginBottom: "0.5em",
              fontWeight: 600,
              fontSize: "1.1em",
              color: "#334155",
              letterSpacing: "0.02em",
            }}
          >
            LogMAR: {currentLogMAR.toFixed(3)}
          </div>
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
      {(() => {
        // X values: the LogMARs from the alphaProbabilities
        const alphaProbabilities = guessingEngine.getAlphaProbabilities();
        const alphaLogMARs: number[] = [...alphaProbabilities.keys()].sort((a, b) => a - b);
        return (
          <div
            style={{
              width: "100%",
              backgroundColor: "#f0f0f0",
              borderTop: "2px solid #ccc",
              zIndex: 1000,
              height: "25vh",
            }}
          >
            {/* Prepare data for the psychometric function line */}
            {(() => {
              // Get the engine's best guess at alpha and beta
              const { guessedLogMAR, beta } = guessingEngine.guessUserLogMAR();
              // Use the same gamma and lambda as the engine
              const gamma = 1 / 8; // 8 Landolt C orientations
              const lambda = UserLogMARGuessingEngine.LOGISTIC_PSYCHOMETRIC_LAMBDA;

              // Calculate the psychometric function at each LogMAR
              const psychometricLine: ProbabilityGraphDatapoint[] = alphaLogMARs.map((logMAR) => ({
                logMAR,
                probability: calculateLogisticPsychometric(
                  logMAR,
                  guessedLogMAR,
                  beta,
                  gamma,
                  lambda
                ),
              }));

              console.log("Generated psychometricLine:", {
                length: psychometricLine.length,
                firstFew: psychometricLine.slice(0, 3),
              });

              const alphaProbabilitiesForGraph: ProbabilityGraphDatapoint[] = alphaLogMARs.map(
                (logMAR) => {
                  const probability = alphaProbabilities.get(logMAR);
                  if (probability === undefined) {
                    throw new Error("Couldn't find LogMAR in probability graph; this is a bug");
                  }
                  return {
                    logMAR: logMAR,
                    probability: probability,
                  };
                }
              );

              // Pass both the alphaProbabilities and the psychometricLine to the graph
              return (
                <AlphaProbabilityGraph
                  alphaPosteriors={alphaProbabilitiesForGraph}
                  psychometricLine={psychometricLine}
                  currentLogMAR={currentLogMAR} // Pass the current LogMAR value
                  nextTrialLogMAR={guessingEngine.proposeNextTrialLogMAR()} // Pass the next trial LogMAR value
                />
              );
            })()}
          </div>
        );
      })()}
    </div>
  );
};

export default LogMARChart;
