import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import HomePage from './pages/HomePage';
import CalibrationPage from './pages/CalibrationPage';
import ViewingConfigurationsPage from './pages/ViewingConfigurationsPage';
import AssessmentPage from './pages/AssessmentPage';
import ResultsPage from './pages/ResultsPage';
import LoginPage from './pages/LoginPage';
import { ROUTES } from './lib/routes';
import { AuthProvider } from './lib/AuthContext';
import ProtectedRoute from './components/layout/ProtectedRoute.tsx';
import SignupPage from './pages/SignupPage.tsx';
import LuxDevicesPage from './pages/LuxDevicesPage.tsx';
import AdminPage from './pages/AdminUserDataManagement.tsx';

const AppInner: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<Navigate to={ROUTES.HOME} replace />} />
      <Route path={ROUTES.ADMIN} element={<AdminPage />} />
      <Route
        path={ROUTES.HOME}
        element={
          <ProtectedRoute>
            <HomePage />
          </ProtectedRoute>
        }
      />
      <Route
        path={ROUTES.CALIBRATION}
        element={
          <ProtectedRoute>
            <CalibrationPage />
          </ProtectedRoute>
        }
      />
      <Route
        path={ROUTES.VIEWING_CONFIGURATIONS}
        element={
          <ProtectedRoute>
            <ViewingConfigurationsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path={ROUTES.LUX_DEVICES}
        element={
          <ProtectedRoute>
            <LuxDevicesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path={ROUTES.ASSESSMENT}
        element={
          <ProtectedRoute>
            <AssessmentPage />
          </ProtectedRoute>
        }
      />
      <Route
        path={ROUTES.RESULTS}
        element={
          <ProtectedRoute>
            <ResultsPage />
          </ProtectedRoute>
        }
      />

      {/* Public routes */}
      <Route path={ROUTES.LOGIN} element={<LoginPage />} />
      <Route path={ROUTES.SIGNUP} element={<SignupPage />} />
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <AppInner />
      </Router>
    </AuthProvider>
  );
};

export default App;
