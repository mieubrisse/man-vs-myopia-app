import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface AlphaProbabilityGraphProps {
  data: { logMAR: number; probability: number }[];
}

const AlphaProbabilityGraph: React.FC<AlphaProbabilityGraphProps> = ({ data }) => {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
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
        <Bar dataKey="probability" fill="#3b82f6" />
      </BarChart>
    </ResponsiveContainer>
  );
};

export default AlphaProbabilityGraph;
