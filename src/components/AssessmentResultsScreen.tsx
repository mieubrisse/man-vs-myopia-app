import React from "react";
import "./AssessmentResultsScreen.css";

interface AssessmentResultsScreenProps {
  onGoHome: () => void;
  logMARScore: number;
  correctLetters: number;
  totalLetters: number;
}

const AssessmentResultsScreen: React.FC<AssessmentResultsScreenProps> = ({
  onGoHome,
  logMARScore,
  correctLetters,
  totalLetters,
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

  const visionLevel = getVisionLevel(logMARScore);
  const visionColor = getVisionColor(logMARScore);

  return (
    <div className="assessment-results-screen">
      <div className="results-container">
        <h1>Assessment Complete</h1>
        <p className="results-description">
          Your LogMAR vision assessment results are below.
        </p>

        <div className="results-card">
          <div className="score-section">
            <h2>LogMAR Score</h2>
            <div className="logmar-score" style={{ color: visionColor }}>
              {logMARScore.toFixed(2)}
            </div>
            <div className="vision-level" style={{ color: visionColor }}>
              {visionLevel}
            </div>
          </div>

          <div className="details-section">
            <h3>Assessment Details</h3>
            <div className="detail-row">
              <span className="detail-label">Correct Letters:</span>
              <span className="detail-value">{correctLetters}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Total Letters:</span>
              <span className="detail-value">{totalLetters}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Accuracy:</span>
              <span className="detail-value">
                {totalLetters > 0
                  ? ((correctLetters / totalLetters) * 100).toFixed(1)
                  : 0}
                %
              </span>
            </div>
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
