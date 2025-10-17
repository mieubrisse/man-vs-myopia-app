import React, { useState } from 'react';
import LogMARChart from './assessmentWorkflow/LogMARChart.tsx';
import EyeIntroScreen from './assessmentWorkflow/EyeIntroScreen.tsx';
import BrightnessReminder from './assessmentWorkflow/BrightnessReminder.tsx';
import LuxDeviceSelectionScreen from './assessmentWorkflow/LuxDeviceSelectionScreen.tsx';
import {
  type Eye,
  EyeDataStorage,
  type EyeTestResult,
  type LuxDevice,
  type VisionTest,
} from '../lib/EyeDataStorage';
import { UserLogMARGuessingEngine } from '../lib/UserLogMARGuessingEngine';
import type { CalibrationData, ViewingConfiguration } from './assessmentWorkflow/types.ts';
import ViewingConfigurationSelectionScreen from './assessmentWorkflow/ViewingConfigurationSelectionScreen.tsx';
import AssessmentResultsScreen from './assessmentWorkflow/AssessmentResultsScreen.tsx';

interface EyeAssessmentWorkflowProps {
  createGuessingEngine: (eye: Eye) => Promise<UserLogMARGuessingEngine>;
}

type WorkflowState =
  | { state: 'configSelection' }
  | {
      state: 'brightnessReminder';
      viewingConfiguration: ViewingConfiguration;
      calibrationData: CalibrationData;
    }
  | {
      state: 'luxDeviceSelection';
      viewingConfiguration: ViewingConfiguration;
      calibrationData: CalibrationData;
    }
  | {
      state: 'leftEyeIntro';
      viewingConfiguration: ViewingConfiguration;
      calibrationData: CalibrationData;
      luxDevice: LuxDevice | null;
      luxMeasurement: number | null;
    }
  | {
      state: 'leftEyeTest';
      engine: UserLogMARGuessingEngine;
      startTime: number;
      viewingConfiguration: ViewingConfiguration;
      calibrationData: CalibrationData;
      luxDevice: LuxDevice | null;
      luxMeasurement: number | null;
    }
  | {
      state: 'rightEyeIntro';
      viewingConfiguration: ViewingConfiguration;
      calibrationData: CalibrationData;
      luxDevice: LuxDevice | null;
      luxMeasurement: number | null;
      leftEyeResult: EyeTestResult;
    }
  | {
      state: 'rightEyeTest';
      engine: UserLogMARGuessingEngine;
      startTime: number;
      viewingConfiguration: ViewingConfiguration;
      calibrationData: CalibrationData;
      luxDevice: LuxDevice | null;
      luxMeasurement: number | null;
      leftEyeResult: EyeTestResult;
    }
  | {
      state: 'complete';
      viewingConfiguration: ViewingConfiguration;
      calibrationData: CalibrationData;
      luxDevice: LuxDevice | null;
      luxMeasurement: number | null;
      leftEyeResult: EyeTestResult;
      rightEyeResult: EyeTestResult;
    };

const EyeAssessmentWorkflow: React.FC<EyeAssessmentWorkflowProps> = ({ createGuessingEngine }) => {
  const [workflowState, setWorkflowState] = useState<WorkflowState>({
    state: 'configSelection',
  });

  const handleLeftEyeComplete = (results: {
    logMARScore: number;
    correctLetters: number;
    totalLetters: number;
    attemptedLetters: number;
  }) => {
    if (workflowState.state !== 'leftEyeTest') {
      throw new Error('Cannot complete left eye when not running test');
    }
    const eyeData: EyeTestResult = {
      ...results,
      completedTimestamp: Date.now(),
      startedTimestamp: workflowState.startTime,
    };

    setWorkflowState({
      state: 'rightEyeIntro',
      viewingConfiguration: workflowState.viewingConfiguration,
      calibrationData: workflowState.calibrationData,
      luxDevice: workflowState.luxDevice,
      luxMeasurement: workflowState.luxMeasurement,
      leftEyeResult: eyeData,
    });
  };

  const handleRightEyeComplete = async (results: {
    logMARScore: number;
    correctLetters: number;
    totalLetters: number;
    attemptedLetters: number;
  }) => {
    if (workflowState.state !== 'rightEyeTest') {
      throw new Error('Cannot complete right eye when not running test');
    }

    const eyeData: EyeTestResult = {
      ...results,
      completedTimestamp: Date.now(),
      startedTimestamp: workflowState.startTime,
    };

    // Save the complete test with all metadata
    const visionTest: VisionTest = {
      leftEye: workflowState.leftEyeResult,
      rightEye: eyeData,
      viewingConfigurationName: workflowState.viewingConfiguration.name,
      distanceCentimeters: workflowState.viewingConfiguration.distanceCentimeters,
      pixelsPerCm: workflowState.calibrationData.pixelsPerCm,
      luxDeviceId: workflowState.luxDevice?.id,
      luxMeasurement: workflowState.luxMeasurement ?? undefined,
    };

    try {
      await EyeDataStorage.saveTest(visionTest);
      console.log('Saved test to API');
    } catch (error) {
      console.error('Failed to save vision test:', error);
      // Continue with workflow completion even if save fails
    }

    // Complete the workflow
    setWorkflowState({
      state: 'complete',
      viewingConfiguration: workflowState.viewingConfiguration,
      calibrationData: workflowState.calibrationData,
      luxDevice: workflowState.luxDevice,
      luxMeasurement: workflowState.luxMeasurement,
      leftEyeResult: workflowState.leftEyeResult,
      rightEyeResult: eyeData,
    });
  };

  const handleStartEyeTest = (eye: Eye) => async () => {
    if (workflowState.state === 'leftEyeIntro') {
      setWorkflowState({
        state: 'leftEyeTest',
        engine: await createGuessingEngine(eye),
        startTime: Date.now(),
        viewingConfiguration: workflowState.viewingConfiguration,
        calibrationData: workflowState.calibrationData,
        luxDevice: workflowState.luxDevice,
        luxMeasurement: workflowState.luxMeasurement,
      });
    } else if (workflowState.state === 'rightEyeIntro') {
      setWorkflowState({
        state: 'rightEyeTest',
        engine: await createGuessingEngine(eye),
        startTime: Date.now(),
        viewingConfiguration: workflowState.viewingConfiguration,
        calibrationData: workflowState.calibrationData,
        luxDevice: workflowState.luxDevice,
        luxMeasurement: workflowState.luxMeasurement,
        leftEyeResult: workflowState.leftEyeResult,
      });
    }
  };

  const handleLuxDeviceSelection = (device: LuxDevice | null, measurement: number | null) => {
    if (workflowState.state !== 'luxDeviceSelection') {
      throw new Error('Cannot complete lux device selection when not on lux selection screen');
    }
    setWorkflowState({
      state: 'leftEyeIntro',
      viewingConfiguration: workflowState.viewingConfiguration,
      calibrationData: workflowState.calibrationData,
      luxDevice: device,
      luxMeasurement: measurement,
    });
  };

  const handleViewingConfigurationSelected = (configuration: ViewingConfiguration) => {
    localStorage.setItem('lastSelectedViewingConfigurationId', configuration.id);

    // Get calibration data from localStorage
    const pixelsPerCmString = localStorage.getItem('pixelsPerCm');
    const pixelsPerCm = parseFloat(pixelsPerCmString || 'NaN') || 10;

    setWorkflowState({
      state: 'brightnessReminder',
      viewingConfiguration: configuration,
      calibrationData: { pixelsPerCm },
    });
  };

  switch (workflowState.state) {
    case 'configSelection':
      return (
        <ViewingConfigurationSelectionScreen
          onStartAssessment={handleViewingConfigurationSelected}
        />
      );
    case 'brightnessReminder':
      return (
        <BrightnessReminder
          onContinue={() =>
            setWorkflowState({
              state: 'luxDeviceSelection',
              viewingConfiguration: workflowState.viewingConfiguration,
              calibrationData: workflowState.calibrationData,
            })
          }
        />
      );

    case 'luxDeviceSelection':
      return <LuxDeviceSelectionScreen onContinue={handleLuxDeviceSelection} />;

    case 'leftEyeIntro':
      return <EyeIntroScreen eye="left" onStartTest={handleStartEyeTest('left')} />;

    case 'leftEyeTest':
      return (
        <LogMARChart
          calibrationData={workflowState.calibrationData}
          viewingConfiguration={workflowState.viewingConfiguration}
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
          calibrationData={workflowState.calibrationData}
          viewingConfiguration={workflowState.viewingConfiguration}
          onAssessmentComplete={handleRightEyeComplete}
          guessingEngine={workflowState.engine}
          currentEye="right"
        />
      );

    case 'complete':
      return (
        <AssessmentResultsScreen
          results={{ leftEye: workflowState.leftEyeResult, rightEye: workflowState.rightEyeResult }}
          viewingConfiguration={workflowState.viewingConfiguration}
          calibrationData={workflowState.calibrationData}
          luxDevice={workflowState.luxDevice}
          luxMeasurement={workflowState.luxMeasurement}
        />
      );

    default:
      return null;
  }
};

export default EyeAssessmentWorkflow;
