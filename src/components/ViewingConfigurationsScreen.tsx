import React, { useState, useEffect } from "react";
import "./ViewingConfigurationsScreen.css";

interface ViewingConfiguration {
  id: string;
  name: string;
  distanceCentimeters: number;
}

interface ViewingConfigurationsScreenProps {
  onGoHome: () => void;
}

const ViewingConfigurationsScreen: React.FC<
  ViewingConfigurationsScreenProps
> = ({ onGoHome }) => {
  const [configurations, setConfigurations] = useState<ViewingConfiguration[]>(
    []
  );
  const [newConfigName, setNewConfigName] = useState("");
  const [newConfigDistance, setNewConfigDistance] = useState("");
  const [error, setError] = useState("");

  // Load existing configurations on component mount
  useEffect(() => {
    const savedConfigurations = localStorage.getItem("viewingConfigurations");
    if (savedConfigurations) {
      try {
        const parsed = JSON.parse(savedConfigurations);
        setConfigurations(parsed);
      } catch (e) {
        console.error("Error loading viewing configurations:", e);
      }
    }
  }, []);

  const generateUUID = (): string => {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
      /[xy]/g,
      function (c) {
        const r = (Math.random() * 16) | 0;
        const v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      }
    );
  };

  const handleAddConfiguration = (e: React.FormEvent) => {
    e.preventDefault();

    if (!newConfigName.trim()) {
      setError("Please enter a configuration name");
      return;
    }

    const distance = parseFloat(newConfigDistance);
    if (isNaN(distance) || distance <= 0) {
      setError("Please enter a valid positive distance");
      return;
    }

    if (distance > 10000) {
      setError("Distance seems too large. Please check your measurement.");
      return;
    }

    setError("");

    const newConfiguration: ViewingConfiguration = {
      id: generateUUID(),
      name: newConfigName.trim(),
      distanceCentimeters: Math.round(distance * 10) / 10,
    };

    const updatedConfigurations = [...configurations, newConfiguration];
    setConfigurations(updatedConfigurations);
    localStorage.setItem(
      "viewingConfigurations",
      JSON.stringify(updatedConfigurations)
    );

    // Clear form
    setNewConfigName("");
    setNewConfigDistance("");
  };

  return (
    <div className="viewing-configurations-screen">
      <div className="home-link">
        <button onClick={onGoHome} className="home-link-button">
          ← Home
        </button>
      </div>

      <div className="viewing-configurations-container">
        <h1>Viewing Configurations</h1>
        <p className="viewing-configurations-description">
          Manage your viewing configurations for different distances from the
          screen.
        </p>

        <div className="add-configuration-section">
          <h2>Add New Configuration</h2>
          <form
            onSubmit={handleAddConfiguration}
            className="add-configuration-form"
          >
            <div className="form-row">
              <div className="input-group">
                <label htmlFor="config-name">Configuration Name:</label>
                <input
                  id="config-name"
                  type="text"
                  value={newConfigName}
                  onChange={(e) => setNewConfigName(e.target.value)}
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
                  onChange={(e) => setNewConfigDistance(e.target.value)}
                  placeholder="e.g., 60.0"
                  className="config-input"
                />
              </div>
            </div>

            {error && <div className="error-message">{error}</div>}

            <button type="submit" className="add-configuration-button">
              Add Configuration
            </button>
          </form>
        </div>

        <div className="configurations-list">
          <h2>Your Configurations</h2>
          {configurations.length === 0 ? (
            <p className="no-configurations">No configurations added yet.</p>
          ) : (
            <div className="configurations-grid">
              {configurations.map((config) => (
                <div key={config.id} className="configuration-card">
                  <h3>{config.name}</h3>
                  <p>{config.distanceCentimeters}cm from screen</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ViewingConfigurationsScreen;
