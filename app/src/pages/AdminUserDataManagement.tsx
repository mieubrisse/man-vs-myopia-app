import React, { useState } from 'react';
import { EyeDataStorage, type UserData } from '../lib/EyeDataStorage';
import { HomeLinkButton } from '../components/buttons/HomeLinkButton.tsx';
import Card from '../components/layout/Card.tsx';
import PageLayout from '../components/layout/PageLayout.tsx';

const AdminPage: React.FC = () => {
  const [userId, setUserId] = useState('');
  const [userData, setUserData] = useState<UserData | null>(null);
  const [jsonText, setJsonText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleLoadUser = async () => {
    if (!userId.trim()) {
      setError('Please enter a user ID');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const data = await EyeDataStorage.getUserDataById(userId.trim());
      if (data) {
        setUserData(data);
        setJsonText(JSON.stringify(data, null, 2));
      } else {
        setError('User not found');
        setUserData(null);
        setJsonText('');
      }
    } catch (err) {
      setError('Error loading user data: ' + (err as Error).message);
      setUserData(null);
      setJsonText('');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveUser = async () => {
    setError('');
    setSuccess('');
    try {
      const parsedData = JSON.parse(jsonText) as UserData;
      await EyeDataStorage.updateUserDataById(parsedData);
      setUserData(parsedData);
      setSuccess('User data saved successfully!');
    } catch (err) {
      setError('Error saving user data: ' + (err as Error).message);
    }
  };

  return (
    <PageLayout>
      <HomeLinkButton />

      <Card>
        <h1>Admin - User Data Management</h1>

        <div style={{ marginTop: '20px' }}>
          <div style={{ marginBottom: '10px' }}>
            <label>
              Firebase User ID:
              <input
                type="text"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                style={{
                  marginLeft: '10px',
                  padding: '5px',
                  width: '300px',
                }}
                placeholder="Enter user ID"
              />
            </label>
            <button
              onClick={handleLoadUser}
              disabled={loading}
              style={{
                marginLeft: '10px',
                padding: '5px 15px',
              }}
            >
              {loading ? 'Loading...' : 'Load User'}
            </button>
          </div>

          {error && (
            <div style={{ color: 'red', marginTop: '10px' }}>{error}</div>
          )}

          {success && (
            <div style={{ color: 'green', marginTop: '10px' }}>{success}</div>
          )}

          {userData && (
            <div style={{ marginTop: '20px' }}>
              <h2>User Data (JSON):</h2>
              <textarea
                value={jsonText}
                onChange={(e) => setJsonText(e.target.value)}
                style={{
                  width: '100%',
                  minHeight: '400px',
                  fontFamily: 'monospace',
                  fontSize: '12px',
                  padding: '10px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                }}
              />
              <button
                onClick={handleSaveUser}
                style={{
                  marginTop: '10px',
                  padding: '8px 20px',
                  backgroundColor: '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                Save Changes
              </button>
            </div>
          )}
        </div>
      </Card>
    </PageLayout>
  );
};

export default AdminPage;
