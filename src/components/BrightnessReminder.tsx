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
        <h1>Maximize Your Brightness</h1>
        <div className="brightness-instructions">
          <p className="main-instruction">
            Turn your screen brightness to maximum for accurate results.
          </p>
        </div>

        <button className="continue-button" onClick={onContinue}>
          Continue
        </button>
      </div>
    </div>
  );
};

export default BrightnessReminder;