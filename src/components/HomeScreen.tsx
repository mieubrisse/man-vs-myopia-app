import React, { useState, useEffect } from "react";
import "./HomeScreen.css";

interface HomeScreenProps {
  onStartCalibration: () => void;
  onStartAssessment: () => void;
}

const HomeScreen: React.FC<HomeScreenProps> = ({
  onStartCalibration,
  onStartAssessment,
}) => {
  const [hasCalibration, setHasCalibration] = useState(false);

  // Check for existing calibration on component mount
  useEffect(() => {
    const existingCalibration = localStorage.getItem("fontHeightMm");
    setHasCalibration(!!existingCalibration);
  }, []);

  const handleStartAssessment = () => {
    if (hasCalibration) {
      onStartAssessment();
    }
  };

  return (
    <div className="home-screen">
      <div className="home-container">
        <h1>Vision Assessment</h1>
        <p className="home-description">
          Welcome to the LogMAR vision assessment tool. Please choose an option
          below.
        </p>

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
            className={`home-option assessment-option ${
              !hasCalibration ? "disabled" : ""
            }`}
            onClick={handleStartAssessment}
            disabled={!hasCalibration}
            title={
              !hasCalibration ? "Complete calibration to start assessment" : ""
            }
          >
            <div className="option-icon">👁️</div>
            <div className="option-content">
              <h3>Start Assessment</h3>
              <p>Begin the LogMAR vision assessment with speech recognition</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default HomeScreen;
