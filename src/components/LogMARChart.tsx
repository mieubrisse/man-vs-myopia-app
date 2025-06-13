import React from "react";
import "./LogMARChart.css";

const LogMARChart: React.FC = () => {
  // Sloan letters - standardized optotype set for visual acuity testing
  const SLOAN_LETTERS = ["C", "D", "H", "K", "N", "O", "R", "S", "V", "Z"];

  // LogMAR values from 1.0 to -0.3 (20/200 to 20/10)
  const logMARValues = [
    1.0, 0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3, 0.2, 0.1, 0.0, -0.1, -0.2, -0.3,
  ];

  // Get random Sloan letters for a row
  const getRandomSloanLetters = (count: number): string[] => {
    const letters: string[] = [];
    for (let i = 0; i < count; i++) {
      const randomIndex = Math.floor(Math.random() * SLOAN_LETTERS.length);
      letters.push(SLOAN_LETTERS[randomIndex]);
    }
    return letters;
  };

  return (
    <div
      style={{ display: "flex", flexDirection: "column", alignItems: "center" }}
    >
      {logMARValues.map((_, index) => (
        <div
          key={index}
          className="chart-row"
          style={{ "--row-index": index } as React.CSSProperties}
        >
          {getRandomSloanLetters(5).map((letter, i) => (
            <span key={i} className="letter">
              {letter}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
};

export default LogMARChart;
