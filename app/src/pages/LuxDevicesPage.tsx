import React, { useState, useEffect } from 'react';
import './LuxDevicesPage.css';
import { HomeLinkButton } from '../components/buttons/HomeLinkButton.tsx';
import Card from '../components/layout/Card.tsx';
import PageLayout from '../components/layout/PageLayout.tsx';
import { EyeDataStorage, type LuxDevice } from '../lib/EyeDataStorage';
import Button from '../components/buttons/Button.tsx';

const LuxDevicesPage: React.FC = () => {
  const [luxDevices, setLuxDevices] = useState<LuxDevice[]>([]);
  const [newDeviceName, setNewDeviceName] = useState('');
  const [editingDevice, setEditingDevice] = useState<LuxDevice | null>(null);
  const [editedName, setEditedName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Load existing lux devices on component mount
  useEffect(() => {
    const loadDevices = async () => {
      try {
        const devices = await EyeDataStorage.getAllLuxDevices();
        setLuxDevices(devices);
        setIsLoading(false);
      } catch (e) {
        console.error('Error loading lux devices:', e);
        setError('Failed to load lux devices. Please try again later.');
        setIsLoading(false);
      }
    };

    loadDevices();
  }, []);

  const generateUUID = (): string => {
    return crypto.randomUUID();
  };

  const handleAddDevice = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newDeviceName.trim()) {
      setError('Please enter a device name');
      return;
    }

    setError('');
    setIsSubmitting(true);

    const newDevice: LuxDevice = {
      id: generateUUID(),
      deviceName: newDeviceName.trim(),
    };

    try {
      await EyeDataStorage.saveLuxDevice(newDevice);
      // Refresh the list
      const updatedDevices = await EyeDataStorage.getAllLuxDevices();
      setLuxDevices(updatedDevices);
      // Clear form
      setNewDeviceName('');
    } catch (e) {
      console.error('Error adding lux device:', e);
      setError('Failed to add lux device. Please try again later.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteDevice = async (deviceId: string) => {
    try {
      await EyeDataStorage.deleteLuxDevice(deviceId);
      // Refresh the list
      const updatedDevices = await EyeDataStorage.getAllLuxDevices();
      setLuxDevices(updatedDevices);
    } catch (e) {
      console.error('Error deleting lux device:', e);
      setError('Failed to delete lux device. Please try again later.');
    }
  };

  const handleStartEdit = (device: LuxDevice) => {
    setEditingDevice(device);
    setEditedName(device.deviceName);
  };

  const handleCancelEdit = () => {
    setEditingDevice(null);
    setEditedName('');
  };

  const handleSaveEdit = async () => {
    if (!editingDevice) return;

    if (!editedName.trim()) {
      setError('Device name cannot be empty');
      return;
    }

    setError('');
    setIsSubmitting(true);

    try {
      const updatedDevice: LuxDevice = {
        ...editingDevice,
        deviceName: editedName.trim(),
      };

      await EyeDataStorage.saveLuxDevice(updatedDevice);

      // Refresh the list
      const updatedDevices = await EyeDataStorage.getAllLuxDevices();
      setLuxDevices(updatedDevices);

      // Exit edit mode
      setEditingDevice(null);
      setEditedName('');
    } catch (e) {
      console.error('Error updating lux device:', e);
      setError('Failed to update lux device. Please try again later.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PageLayout>
      <HomeLinkButton />

      <Card className="lux-devices-container">
        <h1>Lux Devices</h1>
        <p className="lux-devices-description">
          Manage your registry of light measurement devices.
        </p>

        <div className="lux-devices-content">
          <div className="left-column">
            <div className="add-device-section">
              <h2>Add New Device</h2>
              <form onSubmit={handleAddDevice} className="add-device-form">
                <div className="form-row">
                  <div className="input-group">
                    <label htmlFor="device-name">Device Name:</label>
                    <input
                      id="device-name"
                      type="text"
                      value={newDeviceName}
                      onChange={e => setNewDeviceName(e.target.value)}
                      placeholder="e.g., iPhone 15 Pro, Light Meter"
                      className="device-input"
                    />
                  </div>
                </div>

                {error && <div className="error-message">{error}</div>}

                <Button type="submit" variant="primary" size="medium" isLoading={isSubmitting}>
                  Add Device
                </Button>
              </form>
            </div>
          </div>

          <div className="right-column">
            <div className="devices-list">
              <h2>Your Devices</h2>
              {isLoading ? (
                <p className="loading">Loading devices...</p>
              ) : luxDevices.length === 0 ? (
                <p className="no-devices">No devices added yet.</p>
              ) : (
                <div className="devices-list-items">
                  {luxDevices.map(device => (
                    <div key={device.id} className="device-card">
                      {editingDevice && editingDevice.id === device.id ? (
                        <div className="editing-container">
                          <input
                            type="text"
                            value={editedName}
                            onChange={e => setEditedName(e.target.value)}
                            className="edit-device-input"
                            autoFocus
                          />
                          <div className="edit-buttons">
                            <Button
                              onClick={handleSaveEdit}
                              variant="success"
                              size="small"
                              isLoading={isSubmitting}
                            >
                              Save
                            </Button>
                            <Button onClick={handleCancelEdit} variant="secondary" size="small">
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="device-content">
                            <h3>{device.deviceName}</h3>
                          </div>
                          <div className="device-actions">
                            <Button
                              onClick={() => handleStartEdit(device)}
                              variant="secondary"
                              size="small"
                              title="Edit device name"
                            >
                              Edit
                            </Button>
                            <Button
                              onClick={() => handleDeleteDevice(device.id)}
                              variant="danger"
                              size="small"
                              title="Delete device"
                            >
                              Delete
                            </Button>
                          </div>
                        </>
                      )}
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

export default LuxDevicesPage;
