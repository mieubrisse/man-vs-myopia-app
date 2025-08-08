import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./ResultsPage.css";
import { BlobDataStorage } from "../lib/BlobDataStorage";
import type { VisionTest } from "../lib/EyeDataStorage";
import { ROUTES } from "../lib/routes";
import VisionTestResults from "../components/VisionTestResults";

const ResultsPage: React.FC = () => {
  const navigate = useNavigate();
  const [visionTests, setVisionTests] = useState<VisionTest[]>([]);

  useEffect(() => {
    const loadTests = async () => {
      const tests = await BlobDataStorage.getAllTests();
      setVisionTests(tests);
    };
    loadTests();
  }, []);


  const handleClearData = async () => {
    if (window.confirm('Are you sure you want to clear all assessment data? This action cannot be undone.')) {
      try {
        await BlobDataStorage.clearAllData();
        setVisionTests([]);
      } catch (error) {
        console.error('Failed to clear data:', error);
        alert('Failed to clear data. Please try again.');
      }
    }
  };

  return (
    <div className="results-page">
      <div className="home-link">
        <button onClick={() => navigate(ROUTES.HOME)} className="home-link-button">
          ← Home
        </button>
      </div>

      <div className="results-container">
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
      </div>
    </div>
  );
};

export default ResultsPage;