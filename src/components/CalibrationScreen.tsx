import React, { useState, useEffect } from "react";
import "./CalibrationScreen.css";

interface CalibrationScreenProps {
  onGoHome: () => void;
}

const CalibrationScreen: React.FC<CalibrationScreenProps> = ({ onGoHome }) => {
  const [heightMm, setHeightMm] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [hasExistingCalibration, setHasExistingCalibration] = useState(false);
  const [showToast, setShowToast] = useState(false);

  // Load existing calibration on component mount
  useEffect(() => {
    const existingCalibration = localStorage.getItem("fontHeightMm");
    if (existingCalibration) {
      setHeightMm(existingCalibration);
      setHasExistingCalibration(true);
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const height = parseFloat(heightMm);
    if (isNaN(height) || height <= 0) {
      setError("Please enter a valid positive number");
      return;
    }

    if (height > 500) {
      setError("Height seems too large. Please check your measurement.");
      return;
    }

    setError("");

    // Save calibration to localStorage
    localStorage.setItem("fontHeightMm", heightMm);

    // Show success toast
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000); // Hide after 3 seconds
  };

  const handleDeleteCalibration = () => {
    localStorage.removeItem("fontHeightMm");
    setHeightMm("");
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
                Current calibration: <strong>{heightMm}mm</strong>
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
            Please measure the height of the letter "E" below in millimeters
            using a ruler or measuring device.
          </p>

          <form onSubmit={handleSubmit} className="calibration-form">
            <div className="input-group">
              <label htmlFor="height-input">
                Height of the letter "E" (in millimeters):
              </label>
              <input
                id="height-input"
                type="number"
                step="0.1"
                min="0"
                value={heightMm}
                onChange={(e) => setHeightMm(e.target.value)}
                placeholder="Enter height in mm"
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
