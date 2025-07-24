import React from "react";
import "./AssessmentResultsScreen.css";
import type { EyeLogMARData } from "../lib/EyeDataStorage";

interface AssessmentResultsScreenProps {
  onGoHome: () => void;
  results: {
    leftEye: EyeLogMARData | null;
    rightEye: EyeLogMARData | null;
  } | null;
}

const AssessmentResultsScreen: React.FC<AssessmentResultsScreenProps> = ({
  onGoHome,
  results,
}) => {
  const getVisionLevel = (score: number): string => {
    if (score <= 0.0) return "Excellent";
    if (score <= 0.3) return "Good";
    if (score <= 0.5) return "Fair";
    if (score <= 0.7) return "Poor";
    return "Very Poor";
  };

  const getVisionColor = (score: number): string => {
    if (score <= 0.0) return "#28a745"; // Green
    if (score <= 0.3) return "#17a2b8"; // Blue
    if (score <= 0.5) return "#ffc107"; // Yellow
    if (score <= 0.7) return "#fd7e14"; // Orange
    return "#dc3545"; // Red
  };

  const renderEyeResults = (eyeData: EyeLogMARData | null, eyeName: string) => {
    if (!eyeData) {
      return (
        <div className="eye-results">
          <h3>{eyeName} Eye</h3>
          <p>No data available</p>
        </div>
      );
    }

    const visionLevel = getVisionLevel(eyeData.logMARScore);
    const visionColor = getVisionColor(eyeData.logMARScore);

    return (
      <div className="eye-results">
        <h3>{eyeName} Eye</h3>
        <div className="logmar-score" style={{ color: visionColor }}>
          {eyeData.logMARScore.toFixed(3)}
        </div>
        <div className="vision-level" style={{ color: visionColor }}>
          {visionLevel}
        </div>
        <div className="eye-details">
          <div className="detail-row">
            <span className="detail-label">Letters Correct:</span>
            <span className="detail-value">{eyeData.correctLetters}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Letters Attempted:</span>
            <span className="detail-value">{eyeData.attemptedLetters}</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="assessment-results-screen">
      <div className="results-container">
        <h1>Assessment Complete</h1>
        <p className="results-description">
          Your LogMAR vision assessment results for both eyes are below.
        </p>

        <div className="results-card">
          <div className="eyes-results-container" style={{ 
            display: 'flex', 
            gap: '2rem', 
            justifyContent: 'space-around',
            flexWrap: 'wrap' 
          }}>
            {renderEyeResults(results?.leftEye || null, "Left")}
            {renderEyeResults(results?.rightEye || null, "Right")}
          </div>
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
