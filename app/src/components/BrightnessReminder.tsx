import React from 'react';
import './BrightnessReminder.css';
import Button from './buttons/Button.tsx';

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

        <Button variant="success" onClick={onContinue} size={'large'}>
          Continue
        </Button>
      </div>
    </div>
  );
};

export default BrightnessReminder;
