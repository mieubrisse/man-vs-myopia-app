import React, { useState, useEffect } from "react";
import "./CalibrationScreen.css";

interface CalibrationScreenProps {
  onGoHome: () => void;
}

// TODO Contemplate using a credit card-sizing algorithm like myeyes.ai

const CalibrationScreen: React.FC<CalibrationScreenProps> = ({ onGoHome }) => {
  const [heightCm, setHeightCm] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [hasExistingCalibration, setHasExistingCalibration] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [savedCalibrationValue, setSavedCalibrationValue] =
    useState<string>("");

  // Load existing calibration on component mount
  useEffect(() => {
    const existingCalibration = localStorage.getItem("fontHeightCm");
    if (existingCalibration) {
      setHeightCm(existingCalibration);
      setSavedCalibrationValue(existingCalibration);
      setHasExistingCalibration(true);
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const height = parseFloat(heightCm);
    if (isNaN(height) || height <= 0) {
      setError("Please enter a valid positive number");
      return;
    }

    if (height > 50) {
      setError("Height seems too large. Please check your measurement.");
      return;
    }

    setError("");

    // Save calibration to localStorage
    localStorage.setItem("fontHeightCm", heightCm);

    // Update the saved calibration value and show notification
    setSavedCalibrationValue(heightCm);
    setHasExistingCalibration(true);

    // Show success toast
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000); // Hide after 3 seconds
  };

  const handleDeleteCalibration = () => {
    localStorage.removeItem("fontHeightCm");
    setHeightCm("");
    setSavedCalibrationValue("");
    setHasExistingCalibration(false);

    // Show deletion toast
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  return (
    <div className="calibration-screen">
      {showToast && (
        <div className="toast success-toast">Calibration saved!</div>
      )}

      <div className="home-link">
        <button onClick={onGoHome} className="home-link-button">
          ← Home
        </button>
      </div>

      <div className="calibration-container">
        <div className="calibration-left">
          <h1>Font Size Calibration</h1>

          {hasExistingCalibration && (
            <div className="existing-calibration">
              <p>
                Current calibration: <strong>{savedCalibrationValue}cm</strong>
              </p>
              <button
                className="delete-calibration-button"
                onClick={handleDeleteCalibration}
              >
                Delete calibration
              </button>
            </div>
          )}

          <p className="calibration-instructions">
            Please measure the height of the letter "E" below in centimeters
            using a ruler or measuring device.
          </p>

          <form onSubmit={handleSubmit} className="calibration-form">
            <div className="input-group">
              <label htmlFor="height-input">
                Height of the letter "E" (in centimeters):
              </label>
              <input
                id="height-input"
                type="number"
                step="0.1"
                min="0"
                value={heightCm}
                onChange={(e) => setHeightCm(e.target.value)}
                placeholder="Enter height in cm"
                className="height-input"
              />
            </div>

            {error && <div className="error-message">{error}</div>}

            <button type="submit" className="calibration-button">
              Save Calibration
            </button>
          </form>
        </div>

        <div className="calibration-right">
          <div className="calibration-letter">
            <span className="letter-e">E</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CalibrationScreen;
