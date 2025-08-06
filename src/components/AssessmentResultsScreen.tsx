import React from "react";
import "./AssessmentResultsScreen.css";
import VisionTestResults from "./VisionTestResults";
import type { EyeTestResult } from "../lib/EyeDataStorage";

interface AssessmentResultsScreenProps {
  onGoHome: () => void;
  results: {
    leftEye: EyeTestResult | null;
    rightEye: EyeTestResult | null;
  } | null;
}

const AssessmentResultsScreen: React.FC<AssessmentResultsScreenProps> = ({
  onGoHome,
  results,
}) => {
  return (
    <div className="assessment-results-screen">
      <div className="results-container">
        <VisionTestResults 
          singleResult={results}
          title="Assessment Complete"
          description="Your LogMAR vision assessment results for both eyes are below."
          className="assessment-results"
        />

        <div className="action-buttons">
          <button className="home-button" onClick={onGoHome}>
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );
};

export default AssessmentResultsScreen;
