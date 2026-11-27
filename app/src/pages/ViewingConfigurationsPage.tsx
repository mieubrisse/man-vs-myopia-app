import React, { useState, useEffect } from 'react';
import './ViewingConfigurationsPage.css';
import { HomeLinkButton } from '../components/buttons/HomeLinkButton.tsx';
import Card from '../components/layout/Card.tsx';
import PageLayout from '../components/layout/PageLayout.tsx';
import {
  addViewingConfiguration,
  deleteViewingConfiguration,
  loadViewingConfigurations,
  readLegacyLocalConfigurations,
  type ViewingConfiguration,
} from '../lib/ViewingConfigurationStorage.ts';

const ViewingConfigurationsPage: React.FC = () => {
  const [configurations, setConfigurations] = useState<ViewingConfiguration[]>([]);
  const [newConfigName, setNewConfigName] = useState('');
  const [newConfigDistance, setNewConfigDistance] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Load existing configurations on component mount
  useEffect(() => {
    const loadConfigurations = async () => {
      try {
        setConfigurations(await loadViewingConfigurations());
      } catch (e) {
        console.error('Error loading viewing configurations:', e);
        // Show what this browser still holds rather than an empty list.
        setConfigurations(readLegacyLocalConfigurations() ?? []);
        setError('Could not load your viewing configurations from the cloud.');
      } finally {
        setIsLoading(false);
      }
    };

    loadConfigurations();
  }, []);

  const generateUUID = (): string => {
    return crypto.randomUUID();
  };

  const handleAddConfiguration = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newConfigName.trim()) {
      setError('Please enter a configuration name');
      return;
    }

    const distance = parseFloat(newConfigDistance);
    if (isNaN(distance) || distance <= 0) {
      setError('Please enter a valid positive distance');
      return;
    }

    if (distance > 10000) {
      setError('Distance seems too large. Please check your measurement.');
      return;
    }

    setError('');

    const newConfiguration: ViewingConfiguration = {
      id: generateUUID(),
      name: newConfigName.trim(),
      distanceCentimeters: Math.round(distance * 10) / 10,
    };

    setIsSubmitting(true);
    try {
      setConfigurations(await addViewingConfiguration(newConfiguration));
      // Clear form
      setNewConfigName('');
      setNewConfigDistance('');
    } catch (e) {
      console.error('Error saving viewing configuration:', e);
      setError('Could not save the configuration. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfiguration = async (configId: string) => {
    setError('');
    setIsSubmitting(true);
    try {
      setConfigurations(await deleteViewingConfiguration(configId));
    } catch (e) {
      console.error('Error deleting viewing configuration:', e);
      setError('Could not delete the configuration. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PageLayout>
      <HomeLinkButton />

      <Card className="viewing-configurations-container">
        <h1>Viewing Configurations</h1>
        <p className="viewing-configurations-description">
          Manage your viewing configurations for different distances from the screen.
        </p>

        <div className="viewing-configurations-content">
          <div className="left-column">
            <div className="add-configuration-section">
              <h2>Add New Configuration</h2>
              <form onSubmit={handleAddConfiguration} className="add-configuration-form">
                <div className="form-row">
                  <div className="input-group">
                    <label htmlFor="config-name">Configuration Name:</label>
                    <input
                      id="config-name"
                      type="text"
                      value={newConfigName}
                      onChange={e => setNewConfigName(e.target.value)}
                      placeholder="e.g., Desktop, Bedroom, Office"
                      className="config-input"
                    />
                  </div>

                  <div className="input-group">
                    <label htmlFor="config-distance">Distance (centimeters):</label>
                    <input
                      id="config-distance"
                      type="number"
                      step="0.1"
                      min="0"
                      value={newConfigDistance}
                      onChange={e => setNewConfigDistance(e.target.value)}
                      placeholder="e.g., 60.0"
                      className="config-input"
                    />
                  </div>
                </div>

                {error && <div className="error-message">{error}</div>}

                <button
                  type="submit"
                  className="add-configuration-button"
                  disabled={isLoading || isSubmitting}
                >
                  Add Configuration
                </button>
              </form>
            </div>
          </div>

          <div className="right-column">
            <div className="configurations-list">
              <h2>Your Configurations</h2>
              {isLoading ? (
                <p className="no-configurations">Loading…</p>
              ) : configurations.length === 0 ? (
                <p className="no-configurations">No configurations added yet.</p>
              ) : (
                <div className="configurations-list-items">
                  {configurations.map(config => (
                    <div key={config.id} className="configuration-card">
                      <div className="configuration-content">
                        <h3>{config.name}</h3>
                        <p>{config.distanceCentimeters}cm from screen</p>
                      </div>
                      <button
                        className="delete-configuration-button"
                        onClick={() => handleDeleteConfiguration(config.id)}
                        disabled={isSubmitting}
                        title="Delete configuration"
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>
    </PageLayout>
  );
};

export default ViewingConfigurationsPage;
