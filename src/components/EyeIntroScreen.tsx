import React from "react";
import type { Eye } from "../lib/EyeDataStorage";

interface EyeIntroScreenProps {
  eye: Eye;
  onStartTest: () => void;
}

const EyeIntroScreen: React.FC<EyeIntroScreenProps> = ({ eye, onStartTest }) => {
  const eyeName = eye === 'left' ? 'Left' : 'Right';
  const otherEye = eye === 'left' ? 'right' : 'left';

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      padding: '2rem',
      textAlign: 'center'
    }}>
      <h1>{eyeName} Eye Assessment</h1>
      <p style={{ fontSize: '1.2rem', marginBottom: '2rem', maxWidth: '600px' }}>
        {eye === 'left' 
          ? "We'll now test your left eye. Please cover your right eye with your hand or an eye patch, keeping your left eye open and focused on the screen."
          : "Great! Your left eye assessment is complete. Now we'll test your right eye. Please cover your left eye with your hand or an eye patch, keeping your right eye open and focused on the screen."
        }
      </p>
      <button 
        onClick={onStartTest}
        style={{
          padding: '1rem 2rem',
          fontSize: '1.1rem',
          backgroundColor: '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: 'pointer'
        }}
      >
        Start {eyeName} Eye Test
      </button>
    </div>
  );
};

export default EyeIntroScreen;