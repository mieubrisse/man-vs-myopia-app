import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Line,
} from "recharts";

export type ProbabilityGraphDatapoint = {
  logMAR: number;
  probability: number;
};

interface AlphaProbabilityGraphProps {
  alphaPosteriors: ProbabilityGraphDatapoint[];
  psychometricLine?: ProbabilityGraphDatapoint[];
}

const AlphaProbabilityGraph: React.FC<AlphaProbabilityGraphProps> = ({
  alphaPosteriors,
  psychometricLine,
}) => {
  // Merge the bar and line data for the X axis domain
  const allLogMARs = [
    ...alphaPosteriors.map((d) => d.logMAR),
    ...(psychometricLine ? psychometricLine.map((d) => d.logMAR) : []),
  ];
  const domain = [Math.min(...allLogMARs), Math.max(...allLogMARs)];
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={alphaPosteriors}
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
        <YAxis yAxisId="left" orientation="left" />
        <YAxis yAxisId="right" orientation="right" />
        <Tooltip formatter={(value: number) => [value.toExponential(2), "Probability"]} />
        <Bar yAxisId="left" dataKey="probability" fill="#3b82f6" />
        {psychometricLine && (
          <Line
            yAxisId="right"
            data={psychometricLine}
            type="monotone"
            dataKey="probability"
            stroke="#f59e42"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        )}
      </BarChart>
    </ResponsiveContainer>
  );
};

export default AlphaProbabilityGraph;
