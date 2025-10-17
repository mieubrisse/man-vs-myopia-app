import React from 'react';
import type { EyeTestResult } from '../lib/EyeDataStorage';

interface TestCardProps {
  leftEye: EyeTestResult | null;
  rightEye: EyeTestResult | null;
  viewingConfigurationName?: string;
  distanceCentimeters?: number;
  pixelsPerCm?: number;
  luxMeasurement?: number | null;
  luxDevice?: string;
  notes?: string;
  timestamp?: number;
  isLatest?: boolean;
  className?: string;
}

const TestCard: React.FC<TestCardProps> = ({
  leftEye,
  rightEye,
  viewingConfigurationName,
  distanceCentimeters,
  pixelsPerCm,
  luxMeasurement,
  luxDevice,
  notes,
  timestamp,
  isLatest = false,
  className = '',
}) => {
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  // Use timestamp from props or derive from eye results
  const displayTimestamp =
    timestamp ||
    (leftEye && rightEye
      ? Math.max(leftEye.completedTimestamp, rightEye.completedTimestamp)
      : leftEye?.completedTimestamp || rightEye?.completedTimestamp || Date.now());

  return (
    <div className={`test-card ${className}`}>
      {/* Test Header with metadata */}
      {(viewingConfigurationName || distanceCentimeters || pixelsPerCm || timestamp) && (
        <div className="test-header">
          <div className="test-info">
            <span className="test-date">{formatDate(displayTimestamp)}</span>
            {isLatest && <span className="latest-badge">Latest</span>}
          </div>
          <div className="test-metadata">
            {viewingConfigurationName && (
              <span className="config-name">{viewingConfigurationName}</span>
            )}
            {distanceCentimeters && <span className="distance">{distanceCentimeters}cm</span>}
            {pixelsPerCm && <span className="calibration">{pixelsPerCm.toFixed(1)} px/cm</span>}
            {luxDevice && <span className="config-name">{luxDevice}</span>}
            {luxMeasurement && <span className="distance">{luxMeasurement}lx</span>}
          </div>
        </div>
      )}

      {/* Test Content */}
      <div className="test-content">
        <div className="eye-results-grid">
          <EyeResultDisplay eye={leftEye} eyeName={'Left'} />
          <EyeResultDisplay eye={rightEye} eyeName={'Right'} />
        </div>
        {notes && (
          <div className="test-notes">
            <h4>Notes</h4>
            <p>
              <i>{notes}</i>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

interface EyeResultDisplayProps {
  eye: EyeTestResult | null;
  eyeName: 'Left' | 'Right';
}

const EyeResultDisplay: React.FC<EyeResultDisplayProps> = ({ eye, eyeName }) => {
  const getVisionLevel = (score: number): string => {
    if (score <= 0.0) return 'Excellent';
    if (score <= 0.3) return 'Good';
    if (score <= 0.5) return 'Fair';
    if (score <= 0.7) return 'Poor';
    return 'Very Poor';
  };

  const getVisionColor = (score: number): string => {
    if (score <= 0.0) return '#28a745'; // Green
    if (score <= 0.3) return '#17a2b8'; // Blue
    if (score <= 0.5) return '#ffc107'; // Yellow
    if (score <= 0.7) return '#fd7e14'; // Orange
    return '#dc3545'; // Red
  };

  const formatDuration = (startTime: number, endTime: number) => {
    const durationMs = endTime - startTime;
    const minutes = Math.floor(durationMs / 60000);
    const seconds = Math.floor((durationMs % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="eye-result">
      <h4>{eyeName} Eye</h4>
      {eye ? (
        <>
          <div className="logmar-display">
            <div className="logmar-score" style={{ color: getVisionColor(eye.logMARScore) }}>
              {eye.logMARScore.toFixed(3)}
            </div>
            <div className="vision-level" style={{ color: getVisionColor(eye.logMARScore) }}>
              {getVisionLevel(eye.logMARScore)}
            </div>
          </div>
          <div className="eye-details">
            <div className="detail-row">
              <span className="detail-label">Accuracy:</span>
              <span className="detail-value">
                {eye.attemptedLetters > 0
                  ? `${Math.round((eye.correctLetters / eye.attemptedLetters) * 100)}%`
                  : 'N/A'}
              </span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Duration:</span>
              <span className="detail-value">
                {formatDuration(eye.startedTimestamp, eye.completedTimestamp)}
              </span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Letters:</span>
              <span className="detail-value">
                {eye.correctLetters}/{eye.attemptedLetters}
              </span>
            </div>
          </div>
        </>
      ) : (
        <p>No data available</p>
      )}
    </div>
  );
};

export default TestCard;
