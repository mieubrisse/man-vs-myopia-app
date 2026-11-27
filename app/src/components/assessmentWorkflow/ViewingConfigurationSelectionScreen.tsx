import React, { useState, useEffect } from 'react';
import './ViewingConfigurationSelectionScreen.css';
import { HomeLinkButton } from '../buttons/HomeLinkButton.tsx';
import Button from '../buttons/Button.tsx';
import {
  loadViewingConfigurations,
  readLegacyLocalConfigurations,
  type ViewingConfiguration,
} from '../../lib/ViewingConfigurationStorage.ts';

interface ViewingConfigurationSelectionScreenProps {
  onStartAssessment: (selectedConfiguration: ViewingConfiguration) => void;
}

const ViewingConfigurationSelectionScreen: React.FC<ViewingConfigurationSelectionScreenProps> = ({
  onStartAssessment,
}) => {
  const [configurations, setConfigurations] = useState<ViewingConfiguration[]>([]);
  const [selectedConfigurationId, setSelectedConfigurationId] = useState<string>('');

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  // Load configurations and set first one as selected
  useEffect(() => {
    const selectInitialConfiguration = (loaded: ViewingConfiguration[]) => {
      setConfigurations(loaded);
      // Which configuration was last used is a per-device convenience, so it stays local.
      const lastSelectedId = localStorage.getItem('lastSelectedViewingConfigurationId');
      if (lastSelectedId && loaded.some(c => c.id === lastSelectedId)) {
        setSelectedConfigurationId(lastSelectedId);
      } else if (loaded.length > 0) {
        setSelectedConfigurationId(loaded[0].id);
      }
    };

    const load = async () => {
      try {
        selectInitialConfiguration(await loadViewingConfigurations());
      } catch (e) {
        console.error('Error loading viewing configurations:', e);
        // Fall back to what this browser still holds rather than blocking the assessment.
        selectInitialConfiguration(readLegacyLocalConfigurations() ?? []);
        setLoadError('Could not load your viewing configurations from the cloud.');
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, []);

  const handleStartAssessment = () => {
    const selectedConfig = configurations.find(config => config.id === selectedConfigurationId);
    if (selectedConfig) {
      onStartAssessment(selectedConfig);
    }
  };

  const selectedConfiguration = configurations.find(
    config => config.id === selectedConfigurationId
  );

  return (
    <div className="viewing-configuration-selection-screen">
      <HomeLinkButton />

      <div className="selection-container">
        <h1>Select Viewing Configuration</h1>
        <p className="selection-description">
          Choose the viewing configuration that matches your current setup for this assessment.
        </p>

        <div className="configurations-selection">
          <h2>Available Configurations</h2>
          {loadError && <p className="no-configurations">{loadError}</p>}
          {isLoading ? (
            <p className="no-configurations">Loading…</p>
          ) : configurations.length === 0 ? (
            <p className="no-configurations">
              No viewing configurations found. Please add one first.
            </p>
          ) : (
            <div className="configurations-list">
              {configurations.map(config => (
                <div
                  key={config.id}
                  className={`configuration-option ${
                    selectedConfigurationId === config.id ? 'selected' : ''
                  }`}
                  onClick={() => setSelectedConfigurationId(config.id)}
                >
                  <div className="radio-button">
                    <div
                      className={`radio-inner ${
                        selectedConfigurationId === config.id ? 'selected' : ''
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
          <Button
            onClick={handleStartAssessment}
            disabled={!selectedConfiguration}
            variant="primary"
            size={'large'}
          >
            Start Assessment
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ViewingConfigurationSelectionScreen;
