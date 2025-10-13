import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './ResultsPage.css';
import { EyeDataStorage, type VisionTest } from '../lib/EyeDataStorage';
import { ROUTES } from '../lib/routes';
import VisionTestResults from '../components/VisionTestResults';
import { HomeLinkButton } from '../components/buttons/HomeLinkButton.tsx';
import Card from '../components/layout/Card.tsx';
import PageLayout from '../components/layout/PageLayout.tsx';

const ResultsPage: React.FC = () => {
  const navigate = useNavigate();
  const [visionTests, setVisionTests] = useState<VisionTest[]>([]);

  useEffect(() => {
    const loadTests = async () => {
      const tests = await EyeDataStorage.getAllTests();
      setVisionTests(tests);
    };
    loadTests();
  }, []);

  const handleClearData = async () => {
    if (
      window.confirm(
        'Are you sure you want to clear all assessment data? This action cannot be undone.'
      )
    ) {
      try {
        await EyeDataStorage.clearAllData();
        setVisionTests([]);
      } catch (error) {
        console.error('Failed to clear data:', error);
        alert('Failed to clear data. Please try again.');
      }
    }
  };

  return (
    <PageLayout>
      <HomeLinkButton />

      <Card className="results-container">
        <div className="results-header">
          <h1>Assessment Results</h1>
          <p className="results-description">
            Your complete LogMAR vision assessment history for both eyes.
          </p>
        </div>

        <div className="results-content">
          <VisionTestResults
            visionTests={visionTests}
            showActions={true}
            onClearData={handleClearData}
          />

          {visionTests.length === 0 && (
            <div className="no-results-actions">
              <button
                onClick={() => navigate(ROUTES.ASSESSMENT)}
                className="start-assessment-button"
              >
                Start Assessment
              </button>
            </div>
          )}
        </div>
      </Card>
    </PageLayout>
  );
};

export default ResultsPage;
