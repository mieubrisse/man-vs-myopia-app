import React, { useState } from 'react';
import LogMARChart from './LogMARChart';
import EyeIntroScreen from './EyeIntroScreen';
import BrightnessReminder from './BrightnessReminder';
import LuxDeviceSelectionScreen from './LuxDeviceSelectionScreen';
import {
  type Eye,
  EyeDataStorage,
  type EyeTestResult,
  type LuxDevice,
  type VisionTest,
} from '../lib/EyeDataStorage';
import { UserLogMARGuessingEngine } from '../lib/UserLogMARGuessingEngine';

interface CalibrationData {
  pixelsPerCm: number;
}

interface ViewingConfiguration {
  id: string;
  name: string;
  distanceCentimeters: number;
}

interface EyeAssessmentWorkflowProps {
  calibrationData: CalibrationData | null;
  viewingConfiguration: ViewingConfiguration | null;
  onWorkflowComplete: (results: {
    leftEye: EyeTestResult | null;
    rightEye: EyeTestResult | null;
  }) => void;
  createGuessingEngine: (eye: Eye) => Promise<UserLogMARGuessingEngine>;
}

type WorkflowStateWithNoEngine =
  | { state: 'brightnessReminder' }
  | { state: 'luxDeviceSelection' }
  | { state: 'leftEyeIntro' }
  | { state: 'rightEyeIntro' }
  | { state: 'complete' };
type WorkflowStateWithEngine =
  | { state: 'leftEyeTest'; engine: UserLogMARGuessingEngine }
  | { state: 'rightEyeTest'; engine: UserLogMARGuessingEngine };

type WorkflowState = WorkflowStateWithNoEngine | WorkflowStateWithEngine;

const EyeAssessmentWorkflow: React.FC<EyeAssessmentWorkflowProps> = ({
  calibrationData,
  viewingConfiguration,
  onWorkflowComplete,
  createGuessingEngine,
}) => {
  const [workflowState, setWorkflowState] = useState<WorkflowState>({
    state: 'brightnessReminder',
  });
  const [leftEyeResult, setLeftEyeResult] = useState<EyeTestResult | null>(null);
  const [, setRightEyeResult] = useState<EyeTestResult | null>(null);
  const [leftEyeStartTime, setLeftEyeStartTime] = useState<number>(0);
  const [rightEyeStartTime, setRightEyeStartTime] = useState<number>(0);
  const [selectedLuxDevice, setSelectedLuxDevice] = useState<LuxDevice | null>(null);
  const [luxMeasurement, setLuxMeasurement] = useState<number | null>(null);

  const handleLeftEyeComplete = (results: {
    logMARScore: number;
    correctLetters: number;
    totalLetters: number;
    attemptedLetters: number;
  }) => {
    const eyeData: EyeTestResult = {
      ...results,
      completedTimestamp: Date.now(),
      startedTimestamp: leftEyeStartTime,
    };

    setLeftEyeResult(eyeData);
    setWorkflowState({ state: 'rightEyeIntro' });
  };

  const handleRightEyeComplete = async (results: {
    logMARScore: number;
    correctLetters: number;
    totalLetters: number;
    attemptedLetters: number;
  }) => {
    const eyeData: EyeTestResult = {
      ...results,
      completedTimestamp: Date.now(),
      startedTimestamp: rightEyeStartTime,
    };

    setRightEyeResult(eyeData);

    // Save the complete test with all metadata
    if (leftEyeResult && viewingConfiguration && calibrationData) {
      const visionTest: VisionTest = {
        leftEye: leftEyeResult,
        rightEye: eyeData,
        viewingConfigurationName: viewingConfiguration.name,
        distanceCentimeters: viewingConfiguration.distanceCentimeters,
        pixelsPerCm: calibrationData.pixelsPerCm,
        luxDeviceId: selectedLuxDevice?.id,
        luxMeasurement: luxMeasurement ?? undefined,
      };

      try {
        await EyeDataStorage.saveTest(visionTest);
        console.log('Saved test to API');
      } catch (error) {
        console.error('Failed to save vision test:', error);
        // Continue with workflow completion even if save fails
      }
    }

    // Complete the workflow
    onWorkflowComplete({
      leftEye: leftEyeResult,
      rightEye: eyeData,
    });
  };

  const handleStartEyeTest = (eye: Eye) => async () => {
    const setEyeStartTime = eye === 'left' ? setLeftEyeStartTime : setRightEyeStartTime;
    setEyeStartTime(Date.now());
    setWorkflowState({
      state: eye === 'left' ? 'leftEyeTest' : 'rightEyeTest',
      engine: await createGuessingEngine(eye),
    });
  };

  const handleLuxDeviceSelection = (device: LuxDevice | null, measurement: number | null) => {
    setSelectedLuxDevice(device);
    setLuxMeasurement(measurement);
    setWorkflowState({ state: 'leftEyeIntro' });
  };

  switch (workflowState.state) {
    case 'brightnessReminder':
      return (
        <BrightnessReminder onContinue={() => setWorkflowState({ state: 'luxDeviceSelection' })} />
      );

    case 'luxDeviceSelection':
      return <LuxDeviceSelectionScreen onContinue={handleLuxDeviceSelection} />;

    case 'leftEyeIntro':
      return <EyeIntroScreen eye="left" onStartTest={handleStartEyeTest('left')} />;

    case 'leftEyeTest':
      return (
        <LogMARChart
          calibrationData={calibrationData}
          viewingConfiguration={viewingConfiguration}
          onAssessmentComplete={handleLeftEyeComplete}
          guessingEngine={workflowState.engine!}
          currentEye="left"
        />
      );

    case 'rightEyeIntro':
      return <EyeIntroScreen eye="right" onStartTest={handleStartEyeTest('right')} />;

    case 'rightEyeTest':
      return (
        <LogMARChart
          calibrationData={calibrationData}
          viewingConfiguration={viewingConfiguration}
          onAssessmentComplete={handleRightEyeComplete}
          guessingEngine={workflowState.engine}
          currentEye="right"
        />
      );

    default:
      return null;
  }
};

export default EyeAssessmentWorkflow;
