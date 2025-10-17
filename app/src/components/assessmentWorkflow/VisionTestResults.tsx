import React from 'react';
import './VisionTestResults.css';
import TestCard from '../TestCard.tsx';
import type { VisionTest, EyeTestResult, LuxDevice } from '../../lib/EyeDataStorage.ts';

interface VisionTestResultsProps {
  visionTests?: VisionTest[];
  luxDevices?: LuxDevice[];
  singleResult?: {
    leftEye: EyeTestResult | null;
    rightEye: EyeTestResult | null;
  };
  showActions?: boolean;
  onClearData?: () => void;
  className?: string;
  title?: string;
  description?: string;
}

const VisionTestResults: React.FC<VisionTestResultsProps> = ({
  visionTests = [],
  luxDevices = [],
  singleResult,
  showActions = false,
  onClearData,
  className = '',
  title,
  description,
}) => {
  // Handle single result case (immediate post-assessment)
  if (singleResult) {
    return (
      <div className={`vision-test-results ${className}`}>
        {title && <h1>{title}</h1>}
        {description && <p className="results-description">{description}</p>}

        <TestCard
          leftEye={singleResult.leftEye}
          rightEye={singleResult.rightEye}
          className="single-result"
        />
      </div>
    );
  }

  if (visionTests.length === 0) {
    return (
      <div className={`vision-test-results ${className}`}>
        <div className="no-results">
          <h2>No Assessment Data</h2>
          <p>Complete a vision assessment to see your results here.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`vision-test-results ${className}`}>
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
