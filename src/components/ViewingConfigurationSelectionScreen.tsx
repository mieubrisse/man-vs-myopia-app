import React, { useState, useEffect } from "react";
import "./ViewingConfigurationSelectionScreen.css";

interface ViewingConfiguration {
  id: string;
  name: string;
  distanceCentimeters: number;
}

interface ViewingConfigurationSelectionScreenProps {
  onGoHome: () => void;
  onStartAssessment: (selectedConfiguration: ViewingConfiguration) => void;
}

const ViewingConfigurationSelectionScreen: React.FC<ViewingConfigurationSelectionScreenProps> = ({
  onGoHome,
  onStartAssessment,
}) => {
  const [configurations, setConfigurations] = useState<ViewingConfiguration[]>([]);
  const [selectedConfigurationId, setSelectedConfigurationId] = useState<string>("");

  // Load configurations and set first one as selected
  useEffect(() => {
    const savedConfigurations = localStorage.getItem("viewingConfigurations");
    if (savedConfigurations) {
      try {
        const parsed = JSON.parse(savedConfigurations);
        setConfigurations(parsed);

        const lastSelectedId = localStorage.getItem("lastSelectedViewingConfigurationId");
        if (lastSelectedId && parsed.some((c: ViewingConfiguration) => c.id === lastSelectedId)) {
          setSelectedConfigurationId(lastSelectedId);
        } else if (parsed.length > 0) {
          setSelectedConfigurationId(parsed[0].id);
        }
      } catch {
        console.error("Error loading viewing configurations");
      }
    }
  }, []);

  const handleStartAssessment = () => {
    const selectedConfig = configurations.find((config) => config.id === selectedConfigurationId);
    if (selectedConfig) {
      onStartAssessment(selectedConfig);
    }
  };

  const selectedConfiguration = configurations.find(
    (config) => config.id === selectedConfigurationId
  );

  return (
    <div className="viewing-configuration-selection-screen">
      <div className="home-link">
        <button onClick={onGoHome} className="home-link-button">
          ← Home
        </button>
      </div>

      <div className="selection-container">
        <h1>Select Viewing Configuration</h1>
        <p className="selection-description">
          Choose the viewing configuration that matches your current setup for this assessment.
        </p>

        <div className="configurations-selection">
          <h2>Available Configurations</h2>
          {configurations.length === 0 ? (
            <p className="no-configurations">
              No viewing configurations found. Please add one first.
            </p>
          ) : (
            <div className="configurations-list">
              {configurations.map((config) => (
                <div
                  key={config.id}
                  className={`configuration-option ${
                    selectedConfigurationId === config.id ? "selected" : ""
                  }`}
                  onClick={() => setSelectedConfigurationId(config.id)}
                >
                  <div className="radio-button">
                    <div
                      className={`radio-inner ${
                        selectedConfigurationId === config.id ? "selected" : ""
                      }`}
                    ></div>
                  </div>
                  <div className="configuration-details">
                    <h3>{config.name}</h3>
                    <p>{config.distanceCentimeters}cm from screen</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="action-buttons">
          <button
            className="start-assessment-button"
            onClick={handleStartAssessment}
            disabled={!selectedConfiguration}
          >
            Start Assessment
          </button>
        </div>
      </div>
    </div>
  );
};

export default ViewingConfigurationSelectionScreen;
