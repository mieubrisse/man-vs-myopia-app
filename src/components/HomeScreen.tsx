import React, { useState, useEffect } from "react";
import "./HomeScreen.css";
import { EyeDataStorage } from "../lib/EyeDataStorage";
import type { EyeLogMARData } from "../lib/EyeDataStorage";

interface HomeScreenProps {
  onStartCalibration: () => void;
  onStartAssessment: () => void;
  onViewConfigurations: () => void;
  onShowLandoltCTest: () => void;
}

const HomeScreen: React.FC<HomeScreenProps> = ({
  onStartCalibration,
  onStartAssessment,
  onViewConfigurations,
  onShowLandoltCTest,
}) => {
  const [hasCalibration, setHasCalibration] = useState(false);
  const [hasViewingConfigurations, setHasViewingConfigurations] =
    useState(false);
  const [leftEyeData, setLeftEyeData] = useState<EyeLogMARData | null>(null);
  const [rightEyeData, setRightEyeData] = useState<EyeLogMARData | null>(null);

  // Check for existing calibration and viewing configurations on component mount
  useEffect(() => {
    const existingCalibration = localStorage.getItem("pixelsPerCm");
    setHasCalibration(!!existingCalibration);

    const savedConfigurations = localStorage.getItem("viewingConfigurations");
    if (savedConfigurations) {
      try {
        const parsed = JSON.parse(savedConfigurations);
        setHasViewingConfigurations(parsed.length > 0);
      } catch {
        setHasViewingConfigurations(false);
      }
    } else {
      setHasViewingConfigurations(false);
    }

    // Load recent eye data
    const leftData = EyeDataStorage.getEyeData('left');
    const rightData = EyeDataStorage.getEyeData('right');
    setLeftEyeData(leftData.length > 0 ? leftData[0] : null);
    setRightEyeData(rightData.length > 0 ? rightData[0] : null);
  }, []);

  const handleStartAssessment = () => {
    if (hasCalibration && hasViewingConfigurations) {
      onStartAssessment();
    }
  };

  const canStartAssessment = hasCalibration && hasViewingConfigurations;
  const missingRequirements = [];
  if (!hasCalibration) missingRequirements.push("font size calibration");
  if (!hasViewingConfigurations)
    missingRequirements.push("viewing configuration");

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString();
  };

  const renderEyeResult = (eyeData: EyeLogMARData | null, eyeName: string) => {
    if (!eyeData) {
      return (
        <div className="eye-result">
          <h4>{eyeName} Eye</h4>
          <p className="no-data">No recent data</p>
        </div>
      );
    }

    return (
      <div className="eye-result">
        <h4>{eyeName} Eye</h4>
        <div className="logmar-value">{eyeData.logMARScore.toFixed(3)}</div>
        <div className="test-date">{formatDate(eyeData.timestamp)}</div>
      </div>
    );
  };

  return (
    <div className="home-screen">
      <div className="home-container">
        <h1>Vision Assessment</h1>
        <p className="home-description">
          Welcome to the LogMAR vision assessment tool. Please choose an option
          below.
        </p>

        {/* Recent Assessment Results */}
        {(leftEyeData || rightEyeData) && (
          <div className="recent-results">
            <h2>Recent Assessment Results</h2>
            <div className="eyes-results" style={{ 
              display: 'flex', 
              gap: '2rem', 
              justifyContent: 'center',
              marginBottom: '2rem' 
            }}>
              {renderEyeResult(leftEyeData, "Left")}
              {renderEyeResult(rightEyeData, "Right")}
            </div>
          </div>
        )}

        <div className="home-options">
          <button
            className="home-option calibration-option"
            onClick={onStartCalibration}
          >
            <div className="option-icon">📏</div>
            <div className="option-content">
              <h3>Font Size Calibration</h3>
              <p>
                Measure the calibration letter to ensure accurate assessment
              </p>
            </div>
          </button>

          <button
            className="home-option configurations-option"
            onClick={onViewConfigurations}
          >
            <div className="option-icon">⚙️</div>
            <div className="option-content">
              <h3>Viewing Configurations</h3>
              <p>Manage your viewing configurations for different distances</p>
            </div>
          </button>

          <button
            className={`home-option assessment-option ${
              !canStartAssessment ? "disabled" : ""
            }`}
            onClick={handleStartAssessment}
            disabled={!canStartAssessment}
            title={
              !canStartAssessment
                ? `Complete ${missingRequirements.join(
                    " and "
                  )} to start assessment`
                : ""
            }
          >
            <div className="option-icon">👁️</div>
            <div className="option-content">
              <h3>Start Assessment</h3>
              <p>Begin the LogMAR vision assessment with speech recognition</p>
            </div>
          </button>

          <button
            className="home-option landolt-c-test-option"
            onClick={onShowLandoltCTest}
          >
            <div className="option-icon">⭕</div>
            <div className="option-content">
              <h3>Show Landolt C Test</h3>
              <p>Display the Landolt C optotype for testing</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default HomeScreen;
