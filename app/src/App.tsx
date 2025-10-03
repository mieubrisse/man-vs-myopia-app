import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import "./App.css";
import HomePage from "./pages/HomePage";
import CalibrationPage from "./pages/CalibrationPage";
import ViewingConfigurationsPage from "./pages/ViewingConfigurationsPage";
import AssessmentPage from "./pages/AssessmentPage";
import ResultsPage from "./pages/ResultsPage";
import LoginPage from "./pages/LoginPage";
import { ROUTES } from "./lib/routes";
import { AuthProvider } from "./lib/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import SignupPage from "./pages/SignupPage.tsx";

const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path={ROUTES.HOME} element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
          <Route path={ROUTES.LOGIN} element={<LoginPage />} />
          <Route path={ROUTES.SIGNUP} element={<SignupPage />} />
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
        </Routes>
      </Router>
    </AuthProvider>
  );
};

export default App;
