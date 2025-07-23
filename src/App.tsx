import React, { useState, useEffect } from "react";
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

// Factory function to create a guessing engine, automatically reading from localStorage
const createGuessingEngine = (): UserLogMARGuessingEngine => {
  const numDistinctOptotypes = Object.keys(orientationToRotation).length; // Landolt C has 8 orientations
  
  // Check localStorage for previous LogMAR
  let storedLogMAR: number | null = null;
  try {
    const storedLogMARString = localStorage.getItem('leftEyeLogMAR');
    storedLogMAR = storedLogMARString ? parseFloat(storedLogMARString) : null;
    console.log('Retrieved from localStorage:', storedLogMARString, '-> parsed:', storedLogMAR);
  } catch (error) {
    console.error('Error retrieving LogMAR from localStorage:', error);
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
  const [guessingEngine, setGuessingEngine] = useState<UserLogMARGuessingEngine | null>(null);

  // Initialize guessingEngine with stored LogMAR if available
  useEffect(() => {
    setGuessingEngine(createGuessingEngine());
  }, []);
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

    // Reinitialize guessing engine with latest localStorage data
    setGuessingEngine(createGuessingEngine());

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
    if (!guessingEngine) {
      return <div>Loading assessment...</div>;
    }
    
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
