import React, { useState } from "react";
import LogMARChart from "./LogMARChart";
import EyeIntroScreen from "./EyeIntroScreen";
import { EyeDataStorage } from "../lib/EyeDataStorage";
import type { Eye, EyeTestResult, VisionTest } from "../lib/EyeDataStorage";
import { UserLogMARGuessingEngine } from "../lib/UserLogMARGuessingEngine";

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
  createGuessingEngine: (eye: Eye) => UserLogMARGuessingEngine;
}

type WorkflowState = 'leftEyeIntro' | 'leftEyeTest' | 'rightEyeIntro' | 'rightEyeTest' | 'complete';

const EyeAssessmentWorkflow: React.FC<EyeAssessmentWorkflowProps> = ({
  calibrationData,
  viewingConfiguration,
  onWorkflowComplete,
  createGuessingEngine
}) => {
  const [workflowState, setWorkflowState] = useState<WorkflowState>('leftEyeIntro');
  const [leftEyeResult, setLeftEyeResult] = useState<EyeTestResult | null>(null);
  const [rightEyeResult, setRightEyeResult] = useState<EyeTestResult | null>(null);
  const [leftEyeStartTime, setLeftEyeStartTime] = useState<number>(0);
  const [rightEyeStartTime, setRightEyeStartTime] = useState<number>(0);

  const handleLeftEyeComplete = (results: {
    logMARScore: number;
    correctLetters: number;
    totalLetters: number;
    attemptedLetters: number;
  }) => {
    const eyeData: EyeTestResult = {
      ...results,
      completedTimestamp: Date.now(),
      startedTimestamp: leftEyeStartTime
    };
    
    setLeftEyeResult(eyeData);
    setWorkflowState('rightEyeIntro');
  };

  const handleRightEyeComplete = (results: {
    logMARScore: number;
    correctLetters: number;
    totalLetters: number;
    attemptedLetters: number;
  }) => {
    const eyeData: EyeTestResult = {
      ...results,
      completedTimestamp: Date.now(),
      startedTimestamp: rightEyeStartTime
    };
    
    setRightEyeResult(eyeData);
    
    // Save the complete test with all metadata
    if (leftEyeResult && viewingConfiguration && calibrationData) {
      const visionTest: VisionTest = {
        leftEye: leftEyeResult,
        rightEye: eyeData,
        viewingConfigurationName: viewingConfiguration.name,
        distanceCentimeters: viewingConfiguration.distanceCentimeters,
        pixelsPerCm: calibrationData.pixelsPerCm
      };
      
      EyeDataStorage.saveTest(visionTest);
    }
    
    // Complete the workflow
    onWorkflowComplete({
      leftEye: leftEyeResult,
      rightEye: eyeData
    });
  };

  switch (workflowState) {
    case 'leftEyeIntro':
      return (
        <EyeIntroScreen 
          eye="left" 
          onStartTest={() => {
            setLeftEyeStartTime(Date.now());
            setWorkflowState('leftEyeTest');
          }} 
        />
      );

    case 'leftEyeTest':
      return (
        <LogMARChart
          calibrationData={calibrationData}
          viewingConfiguration={viewingConfiguration}
          onAssessmentComplete={handleLeftEyeComplete}
          guessingEngine={createGuessingEngine('left')}
          currentEye="left"
        />
      );

    case 'rightEyeIntro':
      return (
        <EyeIntroScreen 
          eye="right" 
          onStartTest={() => {
            setRightEyeStartTime(Date.now());
            setWorkflowState('rightEyeTest');
          }} 
        />
      );

    case 'rightEyeTest':
      return (
        <LogMARChart
          calibrationData={calibrationData}
          viewingConfiguration={viewingConfiguration}
          onAssessmentComplete={handleRightEyeComplete}
          guessingEngine={createGuessingEngine('right')}
          currentEye="right"
        />
      );

    default:
      return null;
  }
};

export default EyeAssessmentWorkflow;