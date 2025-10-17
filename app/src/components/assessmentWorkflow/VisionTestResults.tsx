import React from 'react';
import './VisionTestResults.css';
import TestCard from '../TestCard.tsx';
import type { VisionTest, LuxDevice } from '../../lib/EyeDataStorage.ts';

interface VisionTestResultsProps {
  visionTests?: VisionTest[];
  luxDevices?: LuxDevice[];
  showActions?: boolean;
  onClearData?: () => void;
}

const VisionTestResults: React.FC<VisionTestResultsProps> = ({
  visionTests = [],
  luxDevices = [],
  showActions = false,
  onClearData,
}) => {
  if (visionTests.length === 0) {
    return (
      <div className={`vision-test-results`}>
        <div className="no-results">
          <h2>No Assessment Data</h2>
          <p>Complete a vision assessment to see your results here.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`vision-test-results`}>
      {showActions && visionTests.length > 0 && onClearData && (
        <div className="results-actions">
          <button
            onClick={onClearData}
            className="clear-data-button"
            title="Clear all assessment data"
          >
            Clear All Data
          </button>
        </div>
      )}

      <div className="tests-history">
        {visionTests.map((test, index) => {
          const testDate = Math.max(
            test.leftEye.completedTimestamp,
            test.rightEye.completedTimestamp
          );

          return (
            <TestCard
              key={`${test.leftEye.completedTimestamp}-${test.rightEye.completedTimestamp}`}
              leftEye={test.leftEye}
              rightEye={test.rightEye}
              viewingConfigurationName={test.viewingConfigurationName}
              distanceCentimeters={test.distanceCentimeters}
              pixelsPerCm={test.pixelsPerCm}
              luxMeasurement={test.luxMeasurement}
              luxDevice={luxDevices.find(d => d.id === test.luxDeviceId)?.deviceName}
              notes={test.notes}
              timestamp={testDate}
              isLatest={index === 0}
            />
          );
        })}
      </div>
    </div>
  );
};

export default VisionTestResults;
