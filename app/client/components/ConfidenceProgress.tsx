import React from "react";

interface ConfidenceProgressProps {
  progress: number; // 0 to 1
}

const ConfidenceProgress: React.FC<ConfidenceProgressProps> = ({ progress }) => {
  const clampedProgress = Math.max(0, Math.min(1, progress));

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
        height: "100%",
        width: "60px",
        border: "4px solid #ccc",
        backgroundColor: "#f0f0f0",
        padding: "0.25rem",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          height: `${clampedProgress * 100}%`,
          backgroundColor: "#3b82f6",
          transition: "height 0.3s ease-in-out",
        }}
      />
    </div>
  );
};

export default ConfidenceProgress;
