import React from "react";

interface LogMARResultsProps {
  score: number;
  onRestart: () => void;
}

const LogMARResults: React.FC<LogMARResultsProps> = ({ score, onRestart }) => {
  // Convert LogMAR score to Snellen equivalent (approximate)
  const getSnellenEquivalent = (logMAR: number): string => {
    const snellenDenominator = Math.round(10 * Math.pow(10, logMAR));
    return `20/${snellenDenominator}`;
  };

  // Get a description of the vision level
  const getVisionDescription = (logMAR: number): string => {
    if (logMAR <= 0.0) return "Excellent vision";
    if (logMAR <= 0.2) return "Good vision";
    if (logMAR <= 0.4) return "Moderate vision";
    if (logMAR <= 0.6) return "Poor vision";
    return "Severe vision impairment";
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
        maxWidth: "600px",
        margin: "0 auto",
        textAlign: "center",
      }}
    >
      <h1 style={{ marginBottom: "2rem" }}>Test Complete!</h1>

      <div
        style={{
          backgroundColor: "#f5f5f5",
          padding: "2rem",
          borderRadius: "10px",
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
          marginBottom: "2rem",
          width: "100%",
        }}
      >
        <h2 style={{ marginBottom: "1rem" }}>Your Results</h2>

        <div style={{ marginBottom: "1rem" }}>
          <div
            style={{ fontSize: "2rem", fontWeight: "bold", color: "#2c3e50" }}
          >
            LogMAR Score: {score.toFixed(2)}
          </div>
          <div
            style={{
              fontSize: "1.5rem",
              color: "#34495e",
              marginTop: "0.5rem",
            }}
          >
            Snellen Equivalent: {getSnellenEquivalent(score)}
          </div>
        </div>

        <div
          style={{
            fontSize: "1.2rem",
            color: "#7f8c8d",
            marginTop: "1rem",
            padding: "1rem",
            backgroundColor: "#fff",
            borderRadius: "5px",
          }}
        >
          {getVisionDescription(score)}
        </div>
      </div>

      <button
        onClick={onRestart}
        style={{
          padding: "1rem 2rem",
          fontSize: "1.2rem",
          backgroundColor: "#3498db",
          color: "white",
          border: "none",
          borderRadius: "5px",
          cursor: "pointer",
          transition: "background-color 0.2s",
        }}
        onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "#2980b9")}
        onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "#3498db")}
      >
        Take Test Again
      </button>
    </div>
  );
};

export default LogMARResults;
