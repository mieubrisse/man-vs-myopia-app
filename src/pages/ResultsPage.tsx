import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./ResultsPage.css";
import { EyeDataStorage } from "../lib/EyeDataStorage";
import type { VisionTest } from "../lib/EyeDataStorage";
import { ROUTES } from "../lib/routes";

const ResultsPage: React.FC = () => {
  const navigate = useNavigate();
  const [visionTests, setVisionTests] = useState<VisionTest[]>([]);

  useEffect(() => {
    setVisionTests(EyeDataStorage.getAllTests());
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

  const formatDuration = (startTime: number, endTime: number) => {
    const durationMs = endTime - startTime;
    const minutes = Math.floor(durationMs / 60000);
    const seconds = Math.floor((durationMs % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const renderTestResults = () => {
    if (visionTests.length === 0) {
      return (
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
      );
    }

    return (
      <div className="tests-history">
        {visionTests.map((test, index) => {
          const testDate = new Date(Math.max(test.leftEye.completedTimestamp, test.rightEye.completedTimestamp));
          
          return (
            <div key={`${test.leftEye.completedTimestamp}-${test.rightEye.completedTimestamp}`} className="test-card">
              <div className="test-header">
                <div className="test-info">
                  <span className="test-date">{formatDate(testDate.getTime())}</span>
                  {index === 0 && <span className="latest-badge">Latest</span>}
                </div>
                <div className="test-metadata">
                  <span className="config-name">{test.viewingConfigurationName}</span>
                  <span className="distance">{test.distanceCentimeters}cm</span>
                  <span className="calibration">{test.pixelsPerCm.toFixed(1)} px/cm</span>
                </div>
              </div>
              
              <div className="test-content">
                <div className="eye-results-grid">
                  {/* Left Eye Results */}
                  <div className="eye-result">
                    <h4>Left Eye</h4>
                    <div className="logmar-display">
                      <div className="logmar-score" style={{ color: getVisionColor(test.leftEye.logMARScore) }}>
                        {test.leftEye.logMARScore.toFixed(3)}
                      </div>
                      <div className="vision-level" style={{ color: getVisionColor(test.leftEye.logMARScore) }}>
                        {getVisionLevel(test.leftEye.logMARScore)}
                      </div>
                    </div>
                    <div className="eye-details">
                      <div className="detail-row">
                        <span className="detail-label">Accuracy:</span>
                        <span className="detail-value">
                          {test.leftEye.attemptedLetters > 0 
                            ? `${Math.round((test.leftEye.correctLetters / test.leftEye.attemptedLetters) * 100)}%`
                            : 'N/A'
                          }
                        </span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">Duration:</span>
                        <span className="detail-value">
                          {formatDuration(test.leftEye.startedTimestamp, test.leftEye.completedTimestamp)}
                        </span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">Letters:</span>
                        <span className="detail-value">
                          {test.leftEye.correctLetters}/{test.leftEye.attemptedLetters}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right Eye Results */}
                  <div className="eye-result">
                    <h4>Right Eye</h4>
                    <div className="logmar-display">
                      <div className="logmar-score" style={{ color: getVisionColor(test.rightEye.logMARScore) }}>
                        {test.rightEye.logMARScore.toFixed(3)}
                      </div>
                      <div className="vision-level" style={{ color: getVisionColor(test.rightEye.logMARScore) }}>
                        {getVisionLevel(test.rightEye.logMARScore)}
                      </div>
                    </div>
                    <div className="eye-details">
                      <div className="detail-row">
                        <span className="detail-label">Accuracy:</span>
                        <span className="detail-value">
                          {test.rightEye.attemptedLetters > 0 
                            ? `${Math.round((test.rightEye.correctLetters / test.rightEye.attemptedLetters) * 100)}%`
                            : 'N/A'
                          }
                        </span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">Duration:</span>
                        <span className="detail-value">
                          {formatDuration(test.rightEye.startedTimestamp, test.rightEye.completedTimestamp)}
                        </span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">Letters:</span>
                        <span className="detail-value">
                          {test.rightEye.correctLetters}/{test.rightEye.attemptedLetters}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const handleClearData = () => {
    if (window.confirm('Are you sure you want to clear all assessment data? This action cannot be undone.')) {
      EyeDataStorage.clearAllData();
      setVisionTests([]);
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
          
          {visionTests.length > 0 && (
            <button 
              onClick={handleClearData}
              className="clear-data-button"
              title="Clear all assessment data"
            >
              Clear All Data
            </button>
          )}
        </div>

        <div className="results-content">
          {renderTestResults()}
        </div>
      </div>
    </div>
  );
};

export default ResultsPage;