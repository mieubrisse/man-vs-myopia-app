import React, { useState } from "react";
import LogMARChart from "./LogMARChart";
import EyeIntroScreen from "./EyeIntroScreen";
import { EyeDataStorage } from "../lib/EyeDataStorage";
import type { Eye, EyeLogMARData } from "../lib/EyeDataStorage";
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
    leftEye: EyeLogMARData | null;
    rightEye: EyeLogMARData | null;
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
  const [leftEyeResult, setLeftEyeResult] = useState<EyeLogMARData | null>(null);
  const [rightEyeResult, setRightEyeResult] = useState<EyeLogMARData | null>(null);

  const handleLeftEyeComplete = (results: {
    logMARScore: number;
    correctLetters: number;
    totalLetters: number;
    attemptedLetters: number;
  }) => {
    const eyeData: EyeLogMARData = {
      ...results,
      timestamp: Date.now()
    };
    
    EyeDataStorage.saveEyeData('left', eyeData);
    setLeftEyeResult(eyeData);
    setWorkflowState('rightEyeIntro');
  };

  const handleRightEyeComplete = (results: {
    logMARScore: number;
    correctLetters: number;
    totalLetters: number;
    attemptedLetters: number;
  }) => {
    const eyeData: EyeLogMARData = {
      ...results,
      timestamp: Date.now()
    };
    
    EyeDataStorage.saveEyeData('right', eyeData);
    setRightEyeResult(eyeData);
    
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
          onStartTest={() => setWorkflowState('leftEyeTest')} 
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
          onStartTest={() => setWorkflowState('rightEyeTest')} 
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