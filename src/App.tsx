import React, { useState } from "react";
import "./App.css";
import LogMARChart from "./components/LogMARChart";
import CalibrationScreen from "./components/CalibrationScreen";
import HomeScreen from "./components/HomeScreen";
import ViewingConfigurationsScreen from "./components/ViewingConfigurationsScreen";
import ViewingConfigurationSelectionScreen from "./components/ViewingConfigurationSelectionScreen";
import AssessmentResultsScreen from "./components/AssessmentResultsScreen";
import LandoltCTestScreen from "./components/LandoltCTestScreen";
import { UserLogMARGuessingEngine } from "./lib/UserLogMARGuessingEngine";
import { orientationToRotation } from "./components/LandoltCOptotype";

type AppScreen =
  | "home"
  | "calibration"
  | "assessment"
  | "viewingConfigurations"
  | "viewingConfigurationSelection"
  | "assessmentResults"
  | "landoltCTest";

const App: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<AppScreen>("home");
  const [guessingEngine] = useState(() => {
    const alphaPriors = new Map<number, number>();
    const minLogMAR = -1.0;
    const maxLogMAR = 1.2;
    const step = 0.01;

    // A uniform prior
    let totalEntries = 0;
    for (let logMAR = minLogMAR; logMAR <= maxLogMAR; logMAR += step) {
      totalEntries++;
    }
    const probability = 1 / totalEntries;

    for (let logMAR = minLogMAR; logMAR <= maxLogMAR; logMAR += step) {
      // Round to avoid floating point issues
      const roundedLogMAR = Math.round(logMAR * 1000) / 1000;
      alphaPriors.set(roundedLogMAR, probability);
    }

    const numDistinctOptotypes = Object.keys(orientationToRotation).length; // Landolt C has 8 orientations
    const confidenceInterval = 0.95; // 95% confidence

    return new UserLogMARGuessingEngine(alphaPriors, numDistinctOptotypes, confidenceInterval);
  });
  const [calibrationData, setCalibrationData] = useState<{
    measuredHeightPx: number;
    measuredHeightCm: number;
  } | null>(null);
  const [selectedViewingConfiguration, setSelectedViewingConfiguration] = useState<{
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
    localStorage.setItem("lastSelectedViewingConfigurationId", configuration.id);

    // Get calibration data from localStorage
    const fontHeightCm = localStorage.getItem("fontHeightCm");
    if (fontHeightCm) {
      const measuredHeightCm = parseFloat(fontHeightCm);
      const measuredHeightPx = window.innerWidth > 600 ? 600 : 300; // 600px on desktop, 300px on mobile

      setCalibrationData({
        measuredHeightPx,
        measuredHeightCm,
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
        onShowLandoltCTest={() => setCurrentScreen("landoltCTest")}
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
      <LogMARChart
        calibrationData={calibrationData}
        viewingConfiguration={selectedViewingConfiguration}
        onAssessmentComplete={handleAssessmentComplete}
        guessingEngine={guessingEngine}
      />
    );
  }

  if (currentScreen === "landoltCTest") {
    return <LandoltCTestScreen />;
  }

  return null;
};

export default App;
