"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";

interface TeamChartItem {
  name: string;
  품질: number;
  시의성: number;
  창의성: number;
  협업: number;
}

export function TeamComparisonChart({ data }: { data: TeamChartItem[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
        <YAxis domain={[0, 10]} />
        <Tooltip />
        <Legend />
        <Bar dataKey="품질" fill="#3B82F6" />
        <Bar dataKey="시의성" fill="#10B981" />
        <Bar dataKey="창의성" fill="#F59E0B" />
        <Bar dataKey="협업" fill="#8B5CF6" />
      </BarChart>
    </ResponsiveContainer>
  );
}
