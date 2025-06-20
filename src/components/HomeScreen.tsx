import React, { useState, useEffect } from "react";
import "./HomeScreen.css";

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

  // Check for existing calibration and viewing configurations on component mount
  useEffect(() => {
    const existingCalibration = localStorage.getItem("fontHeightCm");
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
