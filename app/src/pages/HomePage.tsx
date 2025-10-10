import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './HomePage.css';
import { ROUTES } from '../lib/routes';
import Card from '../components/layout/Card.tsx';
import PageLayout from '../components/layout/PageLayout.tsx';

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [hasCalibration, setHasCalibration] = useState(false);
  const [hasViewingConfigurations, setHasViewingConfigurations] = useState(false);

  // Check for existing calibration and viewing configurations on component mount
  useEffect(() => {
    const existingCalibration = localStorage.getItem('pixelsPerCm');
    setHasCalibration(!!existingCalibration);

    const savedConfigurations = localStorage.getItem('viewingConfigurations');
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
      navigate(ROUTES.ASSESSMENT);
    }
  };

  const canStartAssessment = hasCalibration && hasViewingConfigurations;
  const missingRequirements = [];
  if (!hasCalibration) missingRequirements.push('font size calibration');
  if (!hasViewingConfigurations) missingRequirements.push('viewing configuration');

  return (
    <PageLayout>
      <Card className="home-container">
        <h1>Vision Assessment</h1>

        <div className="home-options">
          <button
            className="home-option calibration-option"
            onClick={() => navigate(ROUTES.CALIBRATION)}
          >
            <div className="option-icon">📏</div>
            <div className="option-content">
              <h3>Font Size Calibration</h3>
              <p>Measure the calibration letter to ensure accurate assessment</p>
            </div>
          </button>

          <button
            className="home-option configurations-option"
            onClick={() => navigate(ROUTES.VIEWING_CONFIGURATIONS)}
          >
            <div className="option-icon">⚙️</div>
            <div className="option-content">
              <h3>Viewing Configurations</h3>
              <p>Manage your viewing configurations for different distances</p>
            </div>
          </button>

          <button className="home-option results-option" onClick={() => navigate(ROUTES.RESULTS)}>
            <div className="option-icon">📊</div>
            <div className="option-content">
              <h3>Assessment Results</h3>
              <p>View your complete vision assessment history</p>
            </div>
          </button>

          <button
            className="home-option lux-devices-option"
            onClick={() => navigate(ROUTES.LUX_DEVICES)}
          >
            <div className="option-icon">💡</div>
            <div className="option-content">
              <h3>Lux Devices</h3>
              <p>Manage your light measurement devices for ambient lighting</p>
            </div>
          </button>

          <button
            className={`home-option assessment-option double-span ${!canStartAssessment ? 'disabled' : ''}`}
            onClick={handleStartAssessment}
            disabled={!canStartAssessment}
            title={
              !canStartAssessment
                ? `Complete ${missingRequirements.join(' and ')} to start assessment`
                : ''
            }
          >
            <div className="option-icon">👁️</div>
            <div className="option-content">
              <h3>Start Assessment</h3>
              <p>Begin the LogMAR vision assessment with speech recognition</p>
            </div>
          </button>
        </div>
      </Card>
    </PageLayout>
  );
};

export default HomePage;
