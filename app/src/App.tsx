import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import "./App.css";
import HomePage from "./pages/HomePage";
import CalibrationPage from "./pages/CalibrationPage";
import ViewingConfigurationsPage from "./pages/ViewingConfigurationsPage";
import AssessmentPage from "./pages/AssessmentPage";
import ResultsPage from "./pages/ResultsPage";
import { ROUTES } from "./lib/routes";

import { initializeApp,  } from 'firebase/app';
import { getAnalytics } from "firebase/analytics";

// TODO: Replace the following with your app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyCO1XR2yqK249cv4he7u9kfKY2yn-23clM",
    authDomain: "myopia-data-streams.firebaseapp.com",
    projectId: "myopia-data-streams",
    storageBucket: "myopia-data-streams.firebasestorage.app",
    messagingSenderId: "546263451191",
    appId: "1:546263451191:web:f3177e1254565e5bdc21b2",
    measurementId: "G-HT81VC67L9"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
analytics.app.automaticDataCollectionEnabled = true;

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path={ROUTES.HOME} element={<HomePage />} />
        <Route path={ROUTES.CALIBRATION} element={<CalibrationPage />} />
        <Route path={ROUTES.VIEWING_CONFIGURATIONS} element={<ViewingConfigurationsPage />} />
        <Route path={ROUTES.ASSESSMENT} element={<AssessmentPage />} />
        <Route path={ROUTES.RESULTS} element={<ResultsPage />} />
      </Routes>
    </Router>
  );
};

export default App;
