import React, { useState, useEffect } from 'react';
import './CalibrationPage.css';
import Card from '../components/layout/Card.tsx';
import { HomeLinkButton } from '../components/buttons/HomeLinkButton.tsx';
import PageLayout from '../components/layout/PageLayout.tsx';

// TODO Contemplate using a credit card-sizing algorithm like myeyes.ai

const CalibrationPage: React.FC = () => {
  const [heightCm, setHeightCm] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [hasExistingCalibration, setHasExistingCalibration] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [savedCalibrationValue, setSavedCalibrationValue] = useState<string>('');

  // Load existing calibration on component mount
  useEffect(() => {
    const existingPixelsPerCm = localStorage.getItem('pixelsPerCm');
    if (existingPixelsPerCm) {
      const calculatedHeight = 600 / parseFloat(existingPixelsPerCm);
      setSavedCalibrationValue(`${calculatedHeight.toFixed(1)}cm (${existingPixelsPerCm} px/cm)`);
      setHasExistingCalibration(true);
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Handle measurement input - convert to pixels/cm
    const height = parseFloat(heightCm);
    if (isNaN(height) || height <= 0) {
      setError('Please enter a valid positive number');
      return;
    }

    if (height > 50) {
      setError('Height seems too large. Please check your measurement.');
      return;
    }

    // Convert measurement to pixels/cm using the reference H size
    // The calibration letter H is 600px
    const referenceSizePx = 600;
    const calculatedPixelsPerCm = referenceSizePx / height;

    localStorage.setItem('pixelsPerCm', calculatedPixelsPerCm.toString());
    setSavedCalibrationValue(`${heightCm}cm (${calculatedPixelsPerCm.toFixed(1)} px/cm)`);

    setHasExistingCalibration(true);

    // Show success toast
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const handleDeleteCalibration = () => {
    localStorage.removeItem('pixelsPerCm');
    setHeightCm('');
    setSavedCalibrationValue('');
    setHasExistingCalibration(false);

    // Show deletion toast
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  return (
    <PageLayout>
      {showToast && <div className="toast success-toast">Calibration saved!</div>}
      <HomeLinkButton />
      <Card className="calibration-container">
        <div className="calibration-left">
          <h1>Font Size Calibration</h1>

          {hasExistingCalibration && (
            <div className="existing-calibration">
              <p>
                Current calibration: <strong>{savedCalibrationValue}</strong>
              </p>
              <button className="delete-calibration-button" onClick={handleDeleteCalibration}>
                Delete calibration
              </button>
            </div>
          )}

          <div className="tab-content">
            <p className="calibration-instructions">
              Please measure the height of the letter "H" below in centimeters using a ruler or
              measuring device.
            </p>

            <form onSubmit={handleSubmit} className="calibration-form">
              <div className="input-group">
                <label htmlFor="height-input">Height of the letter "H" (in centimeters):</label>
                <input
                  id="height-input"
                  type="number"
                  step="0.1"
                  min="0"
                  value={heightCm}
                  onChange={e => setHeightCm(e.target.value)}
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
        </div>

        <div className="calibration-right">
          <div className="calibration-letter">
            <svg width="600" height="600" viewBox="-250 -250 500 500" style={{ display: 'block' }}>
              <path
                d="M -250 -250 H -150 V -50 H 150 V -250 H 250 V 250 H 150 V 50 H -150 V 250 H -250 Z"
                fill="#000000"
              />
            </svg>
          </div>
        </div>
      </Card>
    </PageLayout>
  );
};

export default CalibrationPage;
