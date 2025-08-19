import React from "react";
import "./AssessmentResultsScreen.css";
import TestCard from "./TestCard";
import type { EyeTestResult } from "../lib/EyeDataStorage";

interface AssessmentResultsScreenProps {
  onGoHome: () => void;
  results: {
    leftEye: EyeTestResult | null;
    rightEye: EyeTestResult | null;
  } | null;
  viewingConfiguration?: {
    name: string;
    distanceCentimeters: number;
  } | null;
  calibrationData?: {
    pixelsPerCm: number;
  } | null;
}

const AssessmentResultsScreen: React.FC<AssessmentResultsScreenProps> = ({
  onGoHome,
  results,
  viewingConfiguration,
  calibrationData,
}) => {
  if (!results) {
    return (
      <div className="assessment-results-screen">
        <div className="results-container">
          <h1>No Results Available</h1>
          <div className="action-buttons">
            <button className="home-button" onClick={onGoHome}>
              Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="assessment-results-screen">
      <div className="results-container">
        <div className="results-header">
          <h1>Assessment Complete</h1>
          <p className="results-description">
            Your LogMAR vision assessment results for both eyes are below.
          </p>
        </div>

        <div className="results-content">
          <TestCard
            leftEye={results.leftEye}
            rightEye={results.rightEye}
            viewingConfigurationName={viewingConfiguration?.name}
            distanceCentimeters={viewingConfiguration?.distanceCentimeters}
            pixelsPerCm={calibrationData?.pixelsPerCm}
            className="single-result"
          />
        </div>

        <div className="action-buttons">
          <button className="home-button" onClick={onGoHome}>
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );
};

export default AssessmentResultsScreen;
