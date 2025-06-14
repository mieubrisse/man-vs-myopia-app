import React, { useEffect, useRef, useState } from "react";
import type { LogMARChartHandle } from "./LogMARChart";

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

interface SpeechRecognizerProps {
  chartRef: React.RefObject<LogMARChartHandle | null>;
}

interface DebugInfo {
  transcript: string;
  confidence: number;
  letter: string | null;
  timestamp: number;
  isFinal: boolean;
}

const SpeechRecognizer: React.FC<SpeechRecognizerProps> = ({ chartRef }) => {
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const CONFIDENCE_THRESHOLD = 0.6;
  const [debugInfo, setDebugInfo] = useState<DebugInfo[]>([]);

  // Common ways people might say each letter
  const LETTER_MAPPINGS: { [key: string]: string[] } = {
    C: ["C", "SEE", "SEA", "CEE"],
    D: ["D", "DEE", "DE"],
    H: ["H", "AITCH", "HATCH"],
    K: ["K", "KAY", "KAYE"],
    N: ["N", "EN", "END"],
    O: ["O", "OH", "ZERO"],
    R: ["R", "ARE", "OUR", "ARR"],
    S: ["S", "ESS", "ES", "US"],
    V: ["V", "VEE", "VEE"],
    Z: ["Z", "ZEE", "ZED", "ZEE"],
  };

  // Helper function to convert a transcript to a letter
  const transcriptToLetter = (transcript: string): string | null => {
    const upperTranscript = transcript.trim().toUpperCase();

    // Check each letter's possible phrases
    for (const [letter, phrases] of Object.entries(LETTER_MAPPINGS)) {
      if (phrases.some((phrase) => upperTranscript.includes(phrase))) {
        return letter;
      }
    }

    return null;
  };

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
        recognition.start();
      };

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        const result = event.results[event.results.length - 1];
        const transcript = result[0].transcript;
        const confidence = result[0].confidence;
        const letter = transcriptToLetter(transcript);

        // Update debug info for all results
        setDebugInfo((prev) => {
          const newInfo = {
            transcript,
            confidence,
            letter,
            timestamp: Date.now(),
            isFinal: result.isFinal,
          };
          return [...prev, newInfo].slice(-5);
        });

        // Only process final results with sufficient confidence
        if (
          result.isFinal &&
          confidence >= CONFIDENCE_THRESHOLD &&
          letter &&
          chartRef.current
        ) {
          chartRef.current.guessLetter(letter);
        }
      };

      recognition.start();
    } catch (err) {
      console.error("Error initializing speech recognition:", err);
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [chartRef]);

  return (
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
            {info.letter && ` → Detected letter: "${info.letter}"`}
            {!info.isFinal && " (interim)"}
          </div>
        ))
      )}
    </div>
  );
};

export default SpeechRecognizer;
