import React, { useRef, useState } from "react";
import "./App.css";
import type { LogMARChartHandle } from "./components/LogMARChart";
import LogMARChart from "./components/LogMARChart";
import SpeechRecognizer from "./components/SpeechRecognizer";
import CalibrationScreen from "./components/CalibrationScreen";
import HomeScreen from "./components/HomeScreen";

type AppScreen = "home" | "calibration" | "assessment";

const App: React.FC = () => {
  const chartRef = useRef<LogMARChartHandle>(null);
  const [currentScreen, setCurrentScreen] = useState<AppScreen>("home");

  const handleStartCalibration = () => {
    setCurrentScreen("calibration");
  };

  const handleCalibrationComplete = () => {
    setCurrentScreen("assessment");
  };

  const handleStartAssessment = () => {
    setCurrentScreen("assessment");
  };

  const handleGoHome = () => {
    setCurrentScreen("home");
  };

  if (currentScreen === "home") {
    return (
      <HomeScreen
        onStartCalibration={handleStartCalibration}
        onStartAssessment={handleStartAssessment}
      />
    );
  }

  if (currentScreen === "calibration") {
    return (
      <CalibrationScreen
        onCalibrationComplete={handleCalibrationComplete}
        onGoHome={handleGoHome}
      />
    );
  }

  return (
    <div
      className="app"
      style={{
        display: "flex",
        flexDirection: "row",
        gap: "2rem",
        padding: "2rem",
        alignItems: "flex-start",
      }}
    >
      <div style={{ flex: "1 1 auto" }}>
        <LogMARChart ref={chartRef} />
      </div>
      <div
        style={{
          flex: "0 0 400px",
          position: "sticky",
          top: "2rem",
        }}
      >
        <SpeechRecognizer chartRef={chartRef} />
      </div>
    </div>
  );
};

export default App;
