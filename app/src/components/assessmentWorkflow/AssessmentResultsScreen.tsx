import React from 'react';
import './AssessmentResultsScreen.css';
import TestCard from '../TestCard.tsx';
import type { EyeTestResult, LuxDevice } from '../../lib/EyeDataStorage.ts';
import { HomeLinkButton } from '../buttons/HomeLinkButton.tsx';
import Card from '../layout/Card.tsx';
import type { CalibrationData, ViewingConfiguration } from './types.ts';
import PageLayout from '../layout/PageLayout.tsx';

interface AssessmentResultsScreenProps {
  results: {
    leftEye: EyeTestResult;
    rightEye: EyeTestResult;
  };
  viewingConfiguration: ViewingConfiguration;
  calibrationData: CalibrationData;
  luxDevice: LuxDevice | null;
  luxMeasurement: number | null;
  notes: string;
}

const AssessmentResultsScreen: React.FC<AssessmentResultsScreenProps> = ({
  results,
  viewingConfiguration,
  calibrationData,
  luxDevice,
  luxMeasurement,
  notes,
}) => {
  return (
    <PageLayout showNavbar={false}>
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
            luxMeasurement={luxMeasurement}
            luxDevice={luxDevice?.deviceName}
            notes={notes}
            className="single-result"
          />
        </div>

        <HomeLinkButton />
      </Card>
    </PageLayout>
  );
};

export default AssessmentResultsScreen;
