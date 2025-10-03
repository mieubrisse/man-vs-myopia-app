import React from 'react';
import './AssessmentResultsScreen.css';
import TestCard from './TestCard';
import type { EyeTestResult } from '../lib/EyeDataStorage';
import { HomeLinkButton } from './buttons/HomeLinkButton.tsx';
import Card from './layout/Card.tsx';

interface AssessmentResultsScreenProps {
  results: {
    leftEye: EyeTestResult | null;
    rightEye: EyeTestResult | null;
  } | null;
  viewingConfiguration?: {
    name: string;
    distanceCentimeters: number;
  } | null;
  calibrationData?: {
    pixelsPerCm: number;
  } | null;
}

const AssessmentResultsScreen: React.FC<AssessmentResultsScreenProps> = ({
  results,
  viewingConfiguration,
  calibrationData,
}) => {
  if (!results) {
    return (
      <Card>
        <h1>No Results Available</h1>
        <HomeLinkButton />
      </Card>
    );
  }

  return (
    <Card className="results-container">
      <div className="results-header">
        <h1>Assessment Complete</h1>
        <p className="results-description">
          Your LogMAR vision assessment results for both eyes are below.
        </p>
      </div>

      <div className="results-content">
        <TestCard
          leftEye={results.leftEye}
          rightEye={results.rightEye}
          viewingConfigurationName={viewingConfiguration?.name}
          distanceCentimeters={viewingConfiguration?.distanceCentimeters}
          pixelsPerCm={calibrationData?.pixelsPerCm}
          className="single-result"
        />
      </div>

      <HomeLinkButton />
    </Card>
  );
};

export default AssessmentResultsScreen;
