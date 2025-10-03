import React from "react";

interface ResponseIndicatorProps {
  responses: number;
  total: number;
}

const ResponseIndicator: React.FC<ResponseIndicatorProps> = ({ responses, total }) => {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        height: "100%",
        gap: "1rem",
      }}
    >
      {Array.from({ length: total }).map((_, index) => (
        <div
          key={index}
          style={{
            width: "60px",
            height: "60px",
            border: "4px solid #ccc",
            backgroundColor: index < responses ? "#16a34a" : "#f0f0f0",
          }}
        />
      ))}
    </div>
  );
};

export default ResponseIndicator;
