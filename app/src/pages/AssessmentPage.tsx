import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import ViewingConfigurationSelectionScreen from "../components/ViewingConfigurationSelectionScreen";
import EyeAssessmentWorkflow from "../components/EyeAssessmentWorkflow";
import AssessmentResultsScreen from "../components/AssessmentResultsScreen";
import { EyeDataStorage } from "../lib/EyeDataStorage";
import type { Eye, EyeTestResult } from "../lib/EyeDataStorage";
import { UserLogMARGuessingEngine } from "../lib/UserLogMARGuessingEngine";
import { orientationToRotation } from "../components/LandoltCOptotype";
import { ROUTES } from "../lib/routes";

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
  const stepSizeThousandths = Math.round(stepSize * 1000);
  const minLogMARThousandths = Math.round(minLogMAR * 1000);
  const maxLogMARThousandths = Math.round(maxLogMAR * 1000);
  const logMARValues: number[] = [];
  
  for (let logMARTh = minLogMARThousandths; logMARTh <= maxLogMARThousandths; logMARTh += stepSizeThousandths) {
    const logMAR = logMARTh / 1000;
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

// Factory function to create a guessing engine for a specific eye
const createGuessingEngine = (eye: Eye): UserLogMARGuessingEngine => {
  const numDistinctOptotypes = Object.keys(orientationToRotation).length;
  
  // Check for previous LogMAR data for this eye
  let storedLogMAR: number | null = null;
  try {
    storedLogMAR = EyeDataStorage.getLatestLogMAR(eye);
    if (storedLogMAR !== null) {
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
    // Use uniform prior
    alphaPriors = new Map<number, number>();
    
    const stepSizeThousandths = Math.round(LOGMAR_CONFIG.STEP_SIZE * 1000);
    const minLogMARThousandths = Math.round(LOGMAR_CONFIG.MIN_LOGMAR * 1000);
    const maxLogMARThousandths = Math.round(LOGMAR_CONFIG.MAX_LOGMAR * 1000);
    const logMARValues: number[] = [];
    
    for (let logMARTh = minLogMARThousandths; logMARTh <= maxLogMARThousandths; logMARTh += stepSizeThousandths) {
      const logMAR = logMARTh / 1000;
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

type AssessmentState = 'configSelection' | 'assessment' | 'results';

const AssessmentPage: React.FC = () => {
  const navigate = useNavigate();
  const [assessmentState, setAssessmentState] = useState<AssessmentState>('configSelection');
  const [calibrationData, setCalibrationData] = useState<{
    pixelsPerCm: number;
  } | null>(null);
  const [selectedViewingConfiguration, setSelectedViewingConfiguration] = useState<{
    id: string;
    name: string;
    distanceCentimeters: number;
  } | null>(null);
  const [assessmentResults, setAssessmentResults] = useState<{
    leftEye: EyeTestResult | null;
    rightEye: EyeTestResult | null;
  } | null>(null);

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

    setAssessmentState('assessment');
  };

  const handleAssessmentComplete = (results: {
    leftEye: EyeTestResult | null;
    rightEye: EyeTestResult | null;
  }) => {
    setAssessmentResults(results);
    setAssessmentState('results');
  };

  switch (assessmentState) {
    case 'configSelection':
      return (
        <ViewingConfigurationSelectionScreen
          onGoHome={() => navigate(ROUTES.HOME)}
          onStartAssessment={handleViewingConfigurationSelected}
        />
      );

    case 'assessment':
      return (
        <EyeAssessmentWorkflow
          calibrationData={calibrationData}
          viewingConfiguration={selectedViewingConfiguration}
          onWorkflowComplete={handleAssessmentComplete}
          createGuessingEngine={createGuessingEngine}
        />
      );

    case 'results':
      return (
        <AssessmentResultsScreen
          onGoHome={() => navigate(ROUTES.HOME)}
          results={assessmentResults}
        />
      );

    default:
      return null;
  }
};

export default AssessmentPage;