import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import "./App.css";
import HomePage from "./pages/HomePage";
import CalibrationPage from "./pages/CalibrationPage";
import ViewingConfigurationsPage from "./pages/ViewingConfigurationsPage";
import AssessmentPage from "./pages/AssessmentPage";
import ResultsPage from "./pages/ResultsPage";
import LandoltCTestScreen from "./components/LandoltCTestScreen";
import { ROUTES } from "./lib/routes";

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path={ROUTES.HOME} element={<HomePage />} />
        <Route path={ROUTES.CALIBRATION} element={<CalibrationPage />} />
        <Route path={ROUTES.VIEWING_CONFIGURATIONS} element={<ViewingConfigurationsPage />} />
        <Route path={ROUTES.ASSESSMENT} element={<AssessmentPage />} />
        <Route path={ROUTES.RESULTS} element={<ResultsPage />} />
        <Route path={ROUTES.LANDOLT_C_TEST} element={<LandoltCTestScreen />} />
      </Routes>
    </Router>
  );
};

export default App;
