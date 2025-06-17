import React from "react";
import "./HomeScreen.css";

interface HomeScreenProps {
  onStartCalibration: () => void;
  onStartAssessment: () => void;
}

const HomeScreen: React.FC<HomeScreenProps> = ({
  onStartCalibration,
  onStartAssessment,
}) => {
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
              <h3>Calibration</h3>
              <p>
                Measure the calibration letter to ensure accurate assessment
              </p>
            </div>
          </button>

          <button
            className="home-option assessment-option"
            onClick={onStartAssessment}
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
