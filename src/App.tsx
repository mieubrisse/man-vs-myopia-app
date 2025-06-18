import React, { useRef, useState } from "react";
import "./App.css";
import type { LogMARChartHandle } from "./components/LogMARChart";
import LogMARChart from "./components/LogMARChart";
import SpeechRecognizer from "./components/SpeechRecognizer";
import CalibrationScreen from "./components/CalibrationScreen";
import HomeScreen from "./components/HomeScreen";
import ViewingConfigurationsScreen from "./components/ViewingConfigurationsScreen";
import ViewingConfigurationSelectionScreen from "./components/ViewingConfigurationSelectionScreen";
import AssessmentResultsScreen from "./components/AssessmentResultsScreen";

type AppScreen =
  | "home"
  | "calibration"
  | "assessment"
  | "viewingConfigurations"
  | "viewingConfigurationSelection"
  | "assessmentResults";

const App: React.FC = () => {
  const chartRef = useRef<LogMARChartHandle>(null);
  const [currentScreen, setCurrentScreen] = useState<AppScreen>("home");
  const [calibrationData, setCalibrationData] = useState<{
    measuredHeightPx: number;
    measuredHeightMm: number;
  } | null>(null);
  const [selectedViewingConfiguration, setSelectedViewingConfiguration] =
    useState<{
      id: string;
      name: string;
      distanceCentimeters: number;
    } | null>(null);
  const [assessmentResults, setAssessmentResults] = useState<{
    logMARScore: number;
    correctLetters: number;
    totalLetters: number;
    attemptedLetters: number;
  } | null>(null);

  const handleStartCalibration = () => {
    setCurrentScreen("calibration");
  };

  const handleStartAssessment = () => {
    setCurrentScreen("viewingConfigurationSelection");
  };

  const handleViewingConfigurationSelected = (configuration: {
    id: string;
    name: string;
    distanceCentimeters: number;
  }) => {
    setSelectedViewingConfiguration(configuration);

    // Get calibration data from localStorage
    const fontHeightCm = localStorage.getItem("fontHeightCm");
    if (fontHeightCm) {
      const measuredHeightCm = parseFloat(fontHeightCm);
      const measuredHeightMm = measuredHeightCm * 10; // Convert cm to mm
      const measuredHeightPx = window.innerWidth > 600 ? 600 : 300; // 600px on desktop, 300px on mobile

      setCalibrationData({
        measuredHeightPx,
        measuredHeightMm,
      });
    }

    setCurrentScreen("assessment");
  };

  const handleViewConfigurations = () => {
    setCurrentScreen("viewingConfigurations");
  };

  const handleGoHome = () => {
    setCurrentScreen("home");
  };

  const handleAssessmentComplete = (results: {
    logMARScore: number;
    correctLetters: number;
    totalLetters: number;
    attemptedLetters: number;
  }) => {
    setAssessmentResults(results);
    setCurrentScreen("assessmentResults");
  };

  if (currentScreen === "home") {
    return (
      <HomeScreen
        onStartCalibration={handleStartCalibration}
        onStartAssessment={handleStartAssessment}
        onViewConfigurations={handleViewConfigurations}
      />
    );
  }

  if (currentScreen === "calibration") {
    return <CalibrationScreen onGoHome={handleGoHome} />;
  }

  if (currentScreen === "viewingConfigurations") {
    return <ViewingConfigurationsScreen onGoHome={handleGoHome} />;
  }

  if (currentScreen === "viewingConfigurationSelection") {
    return (
      <ViewingConfigurationSelectionScreen
        onGoHome={handleGoHome}
        onStartAssessment={handleViewingConfigurationSelected}
      />
    );
  }

  if (currentScreen === "assessmentResults") {
    return (
      <AssessmentResultsScreen
        onGoHome={handleGoHome}
        logMARScore={assessmentResults?.logMARScore || 0}
        correctLetters={assessmentResults?.correctLetters || 0}
        attemptedLetters={assessmentResults?.attemptedLetters || 0}
      />
    );
  }

  if (currentScreen === "assessment") {
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
          <LogMARChart
            ref={chartRef}
            calibrationData={calibrationData}
            viewingConfiguration={selectedViewingConfiguration}
            onAssessmentComplete={handleAssessmentComplete}
          />
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
  }

  return null;
};

export default App;
