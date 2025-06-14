import React, { useRef } from "react";
import "./App.css";
import type { LogMARChartHandle } from "./components/LogMARChart";
import LogMARChart from "./components/LogMARChart";
import SpeechRecognizer from "./components/SpeechRecognizer";

const App: React.FC = () => {
  const chartRef = useRef<LogMARChartHandle>(null);

  return (
    <div
      className="app"
      style={{
        display: "flex",
        flexDirection: "row",
        gap: "2rem",
        padding: "2rem",
        alignItems: "flex-start",
      }}
    >
      <div style={{ flex: "1 1 auto" }}>
        <LogMARChart ref={chartRef} />
      </div>
      <div
        style={{
          flex: "0 0 400px",
          position: "sticky",
          top: "2rem",
        }}
      >
        <SpeechRecognizer chartRef={chartRef} />
      </div>
    </div>
  );
};

export default App;
