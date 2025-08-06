import React from "react";
import "./BrightnessReminder.css";

interface BrightnessReminderProps {
  onContinue: () => void;
}

const BrightnessReminder: React.FC<BrightnessReminderProps> = ({ onContinue }) => {
  return (
    <div className="brightness-reminder">
      <div className="brightness-container">
        <div className="brightness-icon">🔆</div>
        <h1>Optimize Your Display</h1>
        <div className="brightness-instructions">
          <p className="main-instruction">
            For the most accurate vision assessment, please maximize your screen brightness.
          </p>
          
          <div className="instruction-steps">
            <div className="step">
              <span className="step-number">1</span>
              <span className="step-text">Increase your device brightness to maximum</span>
            </div>
            <div className="step">
              <span className="step-number">2</span>
              <span className="step-text">Ensure you're in a well-lit environment</span>
            </div>
            <div className="step">
              <span className="step-number">3</span>
              <span className="step-text">Position yourself at the configured viewing distance</span>
            </div>
          </div>

          <div className="brightness-note">
            <strong>Note:</strong> Proper lighting conditions ensure the most reliable test results. 
            The optotypes should appear clear and well-contrasted against the background.
          </div>
        </div>

        <button className="continue-button" onClick={onContinue}>
          I've Maximized Brightness - Continue
        </button>
      </div>
    </div>
  );
};

export default BrightnessReminder;