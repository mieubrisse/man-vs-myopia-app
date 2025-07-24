import React, { useState, useEffect } from "react";
import "./App.css";
import LogMARChart from "./components/LogMARChart";
import CalibrationScreen from "./components/CalibrationScreen";
import HomeScreen from "./components/HomeScreen";
import ViewingConfigurationsScreen from "./components/ViewingConfigurationsScreen";
import ViewingConfigurationSelectionScreen from "./components/ViewingConfigurationSelectionScreen";
import AssessmentResultsScreen from "./components/AssessmentResultsScreen";
import LandoltCTestScreen from "./components/LandoltCTestScreen";
import EyeAssessmentWorkflow from "./components/EyeAssessmentWorkflow";
import { UserLogMARGuessingEngine } from "./lib/UserLogMARGuessingEngine";
import { orientationToRotation } from "./components/LandoltCOptotype";
import { EyeDataStorage } from "./lib/EyeDataStorage";
import type { Eye, EyeLogMARData } from "./lib/EyeDataStorage";

// LogMAR engine configuration constants
const LOGMAR_CONFIG = {
  MIN_LOGMAR: -1.0,
  MAX_LOGMAR: 1.2,
  STEP_SIZE: 0.01,
  CONFIDENCE_INTERVAL: 0.95,
  NORMAL_PRIOR_STANDARD_DEVIATION: 0.2,
} as const;

// Helper function to normalize a vector of probabilities
function normalizeVector(vector: number[]): number[] {
  const sum = vector.reduce((prevVal, curr) => prevVal + curr, 0);
  return sum ? vector.map((val) => val / sum) : vector;
}

/**
 * Creates a normal distribution centered around a previous LogMAR value.
 * Used to initialize priors when the user has a previously stored LogMAR score.
 * 
 * @param centerLogMAR The LogMAR value to center the distribution around
 * @param standardDeviation The standard deviation of the normal distribution
 * @param minLogMAR The minimum LogMAR value to include
 * @param maxLogMAR The maximum LogMAR value to include
 * @param stepSize The step size between LogMAR values
 * @returns A Map of LogMAR values to their normalized probabilities
 */
function createNormalPriors(
  centerLogMAR: number,
  standardDeviation: number,
  minLogMAR: number,
  maxLogMAR: number,
  stepSize: number
): Map<number, number> {
  const priors = new Map<number, number>();
  
  // Generate LogMAR values using pure integer arithmetic to avoid floating point errors
  // Work with thousandths internally to match engine precision requirements
  const stepSizeThousandths = Math.round(stepSize * 1000);
  const minLogMARThousandths = Math.round(minLogMAR * 1000);
  const maxLogMARThousandths = Math.round(maxLogMAR * 1000);
  const logMARValues: number[] = [];
  
  for (let logMARTh = minLogMARThousandths; logMARTh <= maxLogMARThousandths; logMARTh += stepSizeThousandths) {
    const logMAR = logMARTh / 1000;  // Convert back to decimal only at the end
    logMARValues.push(logMAR);
  }
  
  // Calculate normal distribution probabilities
  const unnormalizedProbabilities: number[] = logMARValues.map(logMAR => {
    const exponent = -0.5 * Math.pow((logMAR - centerLogMAR) / standardDeviation, 2);
    return Math.exp(exponent);
  });
  
  // Normalize probabilities
  const normalizedProbabilities = normalizeVector(unnormalizedProbabilities);
  
  // Create the Map
  for (let i = 0; i < logMARValues.length; i++) {
    priors.set(logMARValues[i], normalizedProbabilities[i]);
  }
  
  return priors;
}

type AppScreen =
  | "home"
  | "calibration"
  | "assessment"
  | "viewingConfigurations"
  | "viewingConfigurationSelection"
  | "assessmentResults"
  | "landoltCTest";

// Factory function to create a guessing engine for a specific eye
const createGuessingEngine = (eye: Eye): UserLogMARGuessingEngine => {
  const numDistinctOptotypes = Object.keys(orientationToRotation).length; // Landolt C has 8 orientations
  
  // Check for previous LogMAR data for this eye
  let storedLogMAR: number | null = null;
  try {
    const eyeData = EyeDataStorage.getEyeData(eye);
    if (eyeData.length > 0) {
      storedLogMAR = eyeData[0].logMARScore; // Most recent is first
      console.log(`Retrieved ${eye} eye LogMAR from storage:`, storedLogMAR);
    }
  } catch (error) {
    console.error(`Error retrieving ${eye} eye LogMAR from storage:`, error);
  }

  let alphaPriors: Map<number, number>;

  if (storedLogMAR !== null) {
    // Use normal distribution centered on previous LogMAR
    alphaPriors = createNormalPriors(
      storedLogMAR, 
      LOGMAR_CONFIG.NORMAL_PRIOR_STANDARD_DEVIATION, 
      LOGMAR_CONFIG.MIN_LOGMAR, 
      LOGMAR_CONFIG.MAX_LOGMAR, 
      LOGMAR_CONFIG.STEP_SIZE
    );
    console.log('Initialized with normal priors centered at stored LogMAR:', storedLogMAR);
  } else {
    // Use uniform prior as before
    alphaPriors = new Map<number, number>();
    
    // Generate LogMAR values using pure integer arithmetic to avoid floating point errors
    // Work with thousandths internally to match engine precision requirements
    const stepSizeThousandths = Math.round(LOGMAR_CONFIG.STEP_SIZE * 1000);
    const minLogMARThousandths = Math.round(LOGMAR_CONFIG.MIN_LOGMAR * 1000);
    const maxLogMARThousandths = Math.round(LOGMAR_CONFIG.MAX_LOGMAR * 1000);
    const logMARValues: number[] = [];
    
    for (let logMARTh = minLogMARThousandths; logMARTh <= maxLogMARThousandths; logMARTh += stepSizeThousandths) {
      const logMAR = logMARTh / 1000;  // Convert back to decimal only at the end
      logMARValues.push(logMAR);
    }
    
    const probability = 1 / logMARValues.length;
    for (const logMAR of logMARValues) {
      alphaPriors.set(logMAR, probability);
    }
    console.log('Initialized with uniform priors (no stored LogMAR found)');
  }

  return new UserLogMARGuessingEngine(alphaPriors, numDistinctOptotypes, LOGMAR_CONFIG.CONFIDENCE_INTERVAL);
};

const App: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<AppScreen>("home");
  const [calibrationData, setCalibrationData] = useState<{
    pixelsPerCm: number;
  } | null>(null);
  const [selectedViewingConfiguration, setSelectedViewingConfiguration] = useState<{
    id: string;
    name: string;
    distanceCentimeters: number;
  } | null>(null);
  const [assessmentResults, setAssessmentResults] = useState<{
    leftEye: EyeLogMARData | null;
    rightEye: EyeLogMARData | null;
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
    const pixelsPerCmString = localStorage.getItem("pixelsPerCm");
    if (pixelsPerCmString) {
      const pixelsPerCm = parseFloat(pixelsPerCmString);
      setCalibrationData({
        pixelsPerCm,
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
    leftEye: EyeLogMARData | null;
    rightEye: EyeLogMARData | null;
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
        results={assessmentResults}
      />
    );
  }

  if (currentScreen === "assessment") {
    return (
      <EyeAssessmentWorkflow
        calibrationData={calibrationData}
        viewingConfiguration={selectedViewingConfiguration}
        onWorkflowComplete={handleAssessmentComplete}
        createGuessingEngine={createGuessingEngine}
      />
    );
  }

  if (currentScreen === "landoltCTest") {
    return <LandoltCTestScreen />;
  }

  return null;
};

export default App;
