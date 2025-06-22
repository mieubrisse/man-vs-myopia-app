import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
} from "recharts";

interface AlphaProbabilityGraphProps {
  data: { logMAR: number; probability: number }[];
}

const AlphaProbabilityGraph: React.FC<AlphaProbabilityGraphProps> = ({ data }) => {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart
        data={data}
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
          domain={["dataMin", "dataMax"]}
          tickFormatter={(tick) => tick.toFixed(2)}
        />
        <YAxis />
        <Tooltip formatter={(value: number) => [value.toExponential(2), "Probability"]} />
        <Legend />
        <Area
          type="monotone"
          dataKey="probability"
          stroke="none"
          fill="#8884d8"
          fillOpacity={0.3}
          isAnimationActive={true}
          animationDuration={200}
        />
        <Line
          type="monotone"
          dataKey="probability"
          stroke="#8884d8"
          dot={false}
          isAnimationActive={true}
          animationDuration={200}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};

export default AlphaProbabilityGraph;
