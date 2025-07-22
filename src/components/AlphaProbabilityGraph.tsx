import React from "react";
import {
  ComposedChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Line,
  ReferenceLine, // Add ReferenceLine import
} from "recharts";

export type ProbabilityGraphDatapoint = {
  logMAR: number;
  probability: number;
};

interface AlphaProbabilityGraphProps {
  alphaPosteriors: ProbabilityGraphDatapoint[];
  psychometricLine?: ProbabilityGraphDatapoint[];
  currentLogMAR?: number; // Add prop for the vertical line
  nextTrialLogMAR?: number; // Add prop for the green line
}

const AlphaProbabilityGraph: React.FC<AlphaProbabilityGraphProps> = ({
  alphaPosteriors,
  psychometricLine,
  currentLogMAR, // Accept the new prop
  nextTrialLogMAR, // Accept the new prop
}) => {
  // Merge the bar and line data for the X axis domain
  const allLogMARs = [
    ...alphaPosteriors.map((d) => d.logMAR),
    ...(psychometricLine ? psychometricLine.map((d) => d.logMAR) : []),
  ];
  const domain = [Math.min(...allLogMARs), Math.max(...allLogMARs)];

  // Merge both series into a single data array for Recharts
  const mergedData = alphaPosteriors.map((bar, i) => ({
    logMAR: bar.logMAR,
    barProbability: bar.probability,
    lineProbability: psychometricLine ? psychometricLine[i]?.probability ?? null : null,
  }));

  console.log(mergedData);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart
        data={mergedData}
        margin={{
          top: 5,
          right: 30,
          left: 20,
          bottom: 5,
        }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          dataKey="logMAR"
          type="number"
          domain={domain}
          tickFormatter={(tick) => tick.toFixed(2)}
        />
        <YAxis
          yAxisId="left"
          orientation="left"
          domain={[0, "dataMax"]}
          tickFormatter={(tick) => tick.toFixed(3)}
        />
        <YAxis
          yAxisId="right"
          orientation="right"
          domain={[0, 1]}
          tickFormatter={(tick) => tick.toFixed(2)}
          label={{ value: "Psychometric P(correct)", angle: 90, position: "insideRight" }}
        />
        <Tooltip formatter={(value: number) => [value.toFixed(3), "Probability"]} />
        <Bar yAxisId="left" dataKey="barProbability" fill="#3b82f6" />
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="lineProbability"
          stroke="#f59e42"
          dot
          isAnimationActive={false}
          connectNulls={true}
        />
        {/* Add the vertical ReferenceLine if currentLogMAR is provided */}
        {typeof currentLogMAR === "number" && (
          <ReferenceLine
            x={currentLogMAR}
            stroke="#ef4444"
            strokeDasharray="4 2"
            label={{ value: `Current`, position: "top", fill: "#ef4444" }}
            ifOverflow="extendDomain"
            yAxisId="left"
          />
        )}
        {/* Add the green ReferenceLine for nextTrialLogMAR if provided */}
        {typeof nextTrialLogMAR === "number" && (
          <ReferenceLine
            x={nextTrialLogMAR}
            stroke="#22c55e"
            strokeDasharray="4 2"
            label={{ value: `Next Trial`, position: "top", fill: "#22c55e" }}
            ifOverflow="extendDomain"
            yAxisId="left"
          />
        )}
      </ComposedChart>
    </ResponsiveContainer>
  );
};

export default AlphaProbabilityGraph;
