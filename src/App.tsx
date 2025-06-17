import React, { useRef, useState } from "react";
import "./App.css";
import type { LogMARChartHandle } from "./components/LogMARChart";
import LogMARChart from "./components/LogMARChart";
import SpeechRecognizer from "./components/SpeechRecognizer";
import CalibrationScreen from "./components/CalibrationScreen";
import HomeScreen from "./components/HomeScreen";
import ViewingConfigurationsScreen from "./components/ViewingConfigurationsScreen";
import ViewingConfigurationSelectionScreen from "./components/ViewingConfigurationSelectionScreen";

type AppScreen =
  | "home"
  | "calibration"
  | "assessment"
  | "viewingConfigurations"
  | "viewingConfigurationSelection";

const App: React.FC = () => {
  const chartRef = useRef<LogMARChartHandle>(null);
  const [currentScreen, setCurrentScreen] = useState<AppScreen>("home");
  const [calibrationData, setCalibrationData] = useState<{
    measuredHeightPx: number;
    measuredHeightMm: number;
  } | null>(null);

  const handleStartCalibration = () => {
    setCurrentScreen("calibration");
  };

  const handleStartAssessment = () => {
    setCurrentScreen("viewingConfigurationSelection");
  };

  const handleViewingConfigurationSelected = () => {
    // Get calibration data from localStorage
    const fontHeightMm = localStorage.getItem("fontHeightMm");
    if (fontHeightMm) {
      const measuredHeightMm = parseFloat(fontHeightMm);
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
        <LogMARChart ref={chartRef} calibrationData={calibrationData} />
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
