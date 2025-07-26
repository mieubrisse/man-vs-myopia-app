import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./ResultsPage.css";
import { EyeDataStorage } from "../lib/EyeDataStorage";
import type { EyeLogMARData } from "../lib/EyeDataStorage";
import { ROUTES } from "../lib/routes";

const ResultsPage: React.FC = () => {
  const navigate = useNavigate();
  const [leftEyeData, setLeftEyeData] = useState<EyeLogMARData[]>([]);
  const [rightEyeData, setRightEyeData] = useState<EyeLogMARData[]>([]);

  useEffect(() => {
    setLeftEyeData(EyeDataStorage.getEyeData('left'));
    setRightEyeData(EyeDataStorage.getEyeData('right'));
  }, []);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

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

  const renderEyeResults = (eyeData: EyeLogMARData[], eyeName: string) => {
    if (eyeData.length === 0) {
      return (
        <div className="eye-results-section">
          <h2>{eyeName} Eye</h2>
          <p className="no-data">No assessment data available</p>
        </div>
      );
    }

    return (
      <div className="eye-results-section">
        <h2>{eyeName} Eye</h2>
        <div className="results-history">
          {eyeData.map((result, index) => {
            const visionLevel = getVisionLevel(result.logMARScore);
            const visionColor = getVisionColor(result.logMARScore);
            
            return (
              <div key={result.timestamp} className="result-card">
                <div className="result-header">
                  <span className="result-date">{formatDate(result.timestamp)}</span>
                  {index === 0 && <span className="latest-badge">Latest</span>}
                </div>
                <div className="result-content">
                  <div className="logmar-display">
                    <div className="logmar-score" style={{ color: visionColor }}>
                      {result.logMARScore.toFixed(3)}
                    </div>
                    <div className="vision-level" style={{ color: visionColor }}>
                      {visionLevel}
                    </div>
                  </div>
                  <div className="result-details">
                    <div className="detail-row">
                      <span className="detail-label">Correct:</span>
                      <span className="detail-value">{result.correctLetters}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Attempted:</span>
                      <span className="detail-value">{result.attemptedLetters}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Accuracy:</span>
                      <span className="detail-value">
                        {result.attemptedLetters > 0 
                          ? `${Math.round((result.correctLetters / result.attemptedLetters) * 100)}%`
                          : 'N/A'
                        }
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const handleClearData = () => {
    if (window.confirm('Are you sure you want to clear all assessment data? This action cannot be undone.')) {
      EyeDataStorage.clearAllData();
      setLeftEyeData([]);
      setRightEyeData([]);
    }
  };

  return (
    <div className="results-page">
      <div className="home-link">
        <button onClick={() => navigate(ROUTES.HOME)} className="home-link-button">
          ← Home
        </button>
      </div>

      <div className="results-container">
        <div className="results-header">
          <h1>Assessment Results</h1>
          <p className="results-description">
            Your complete LogMAR vision assessment history for both eyes.
          </p>
          
          {(leftEyeData.length > 0 || rightEyeData.length > 0) && (
            <button 
              onClick={handleClearData}
              className="clear-data-button"
              title="Clear all assessment data"
            >
              Clear All Data
            </button>
          )}
        </div>

        {leftEyeData.length === 0 && rightEyeData.length === 0 ? (
          <div className="no-results">
            <h2>No Assessment Data</h2>
            <p>Complete a vision assessment to see your results here.</p>
            <button 
              onClick={() => navigate(ROUTES.ASSESSMENT)}
              className="start-assessment-button"
            >
              Start Assessment
            </button>
          </div>
        ) : (
          <div className="results-content">
            <div className="eyes-results-grid">
              {renderEyeResults(leftEyeData, "Left")}
              {renderEyeResults(rightEyeData, "Right")}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResultsPage;