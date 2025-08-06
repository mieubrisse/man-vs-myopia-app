import React, { useEffect, useRef, useState } from "react";
import type { Eye } from "../lib/EyeDataStorage";

interface EyeIntroScreenProps {
  eye: Eye;
  onStartTest: () => void;
}

const EyeIntroScreen: React.FC<EyeIntroScreenProps> = ({ eye, onStartTest }) => {
  const eyeName = eye === 'left' ? 'Left' : 'Right';
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const [hasVoiceSupport, setHasVoiceSupport] = useState(false);

  // Initialize speech recognition for "continue" command
  useEffect(() => {
    if (!window.webkitSpeechRecognition) {
      console.log("Speech recognition not supported - voice commands unavailable");
      return;
    }

    try {
      const recognition = new window.webkitSpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = "en-US";
      
      recognitionRef.current = recognition;
      setHasVoiceSupport(true);
      
      recognition.onstart = () => {
        console.log("Listening for 'continue' command");
      };
      
      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        if (event.error === "no-speech") {
          console.log("No speech detected");
        } else {
          console.error("Speech recognition error:", event.error);
        }
      };
      
      recognition.onend = () => {
        // Restart recognition to keep listening continuously
        if (recognitionRef.current) {
          recognition.start();
        }
      };
      
      recognition.onresult = (event: SpeechRecognitionEvent) => {
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal || result[0].confidence > 0.7) {
            const transcript = result[0].transcript.toLowerCase().trim();
            console.log("Heard:", transcript);
            
            if (transcript.includes("continue") || transcript.includes("start")) {
              console.log("Continue command detected - starting test");
              recognition.stop();
              onStartTest();
              return;
            }
          }
        }
      };
      
      // Start listening when component mounts
      recognition.start();
    } catch (error) {
      console.error("Failed to initialize speech recognition:", error);
    }

    // Cleanup on unmount
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [onStartTest]);

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
      
      {hasVoiceSupport && (
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '0.5rem', 
          marginBottom: '1rem',
          color: '#28a745',
          fontSize: '1rem'
        }}>
          <span style={{ fontSize: '1.2rem' }}>🎤</span>
          <span>Say "continue" or "start" to begin</span>
        </div>
      )}
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