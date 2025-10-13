import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { EyeDataStorage, type LuxDevice } from '../lib/EyeDataStorage';
import Card from './layout/Card';
import Button from './buttons/Button';
import './LuxDeviceSelectionScreen.css';
import { ROUTES } from '../lib/routes.ts';

interface LuxDeviceSelectionScreenProps {
  onContinue: (selectedDevice: LuxDevice | null, luxMeasurement: number | null) => void;
}

const LuxDeviceSelectionScreen: React.FC<LuxDeviceSelectionScreenProps> = ({ onContinue }) => {
  const [luxDevices, setLuxDevices] = useState<LuxDevice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [luxMeasurement, setLuxMeasurement] = useState<string>('');
  const [measurementError, setMeasurementError] = useState<string>('');

  useEffect(() => {
    const loadDevices = async () => {
      setIsLoading(true);
      try {
        const devices = await EyeDataStorage.getAllLuxDevices();
        setLuxDevices(devices);
        if (devices.length > 0) {
          setSelectedDeviceId(devices[0].id);
        } else {
          // There is no usable lux device
          onContinue(null, null);
        }
      } catch (error) {
        console.error('Failed to load lux devices:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadDevices();
  }, [onContinue]);

  const handleContinue = () => {
    const selectedDevice = luxDevices.find(device => device.id === selectedDeviceId) || null;

    // Validate measurement
    if (!luxMeasurement.trim()) {
      setMeasurementError('Please enter a lux measurement');
      return;
    }

    const luxValue = parseFloat(luxMeasurement);
    if (isNaN(luxValue) || luxValue < 0) {
      setMeasurementError('Please enter a valid positive number');
      return;
    }

    onContinue(selectedDevice, luxValue);
  };

  const handleMeasurementChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLuxMeasurement(e.target.value);
    setMeasurementError('');
  };

  if (isLoading) {
    return (
      <Card size={'large'}>
        <h1>Loading Lux Devices</h1>
        <p>Loading your devices...</p>
      </Card>
    );
  }

  return (
    <div className="lux-device-selection-screen">
      <Card size={'large'}>
        <h1>Lux Measurement</h1>
        <div className="lux-device-selection">
          <p>Select a lux device to use for this assessment:</p>

          <div className="device-list">
            {luxDevices.map(device => (
              <div
                key={device.id}
                className={`device-item ${selectedDeviceId === device.id ? 'selected' : ''}`}
                onClick={() => setSelectedDeviceId(device.id)}
              >
                <div className="device-name">{device.deviceName}</div>
              </div>
            ))}
          </div>

          <div className="measurement-input">
            <label htmlFor="lux-measurement">Enter lux measurement from selected device:</label>
            <input
              id="lux-measurement"
              type="number"
              min="0"
              step="0.1"
              value={luxMeasurement}
              onChange={handleMeasurementChange}
              placeholder="e.g., 500"
              className={measurementError ? 'error' : ''}
            />
            {measurementError && <div className="error-message">{measurementError}</div>}
          </div>

          <div className="action-buttons">
            <Link to={ROUTES.LUX_DEVICES}>
              <Button variant="secondary">Manage Devices</Button>
            </Link>
            <Button onClick={handleContinue}>Continue</Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default LuxDeviceSelectionScreen;
