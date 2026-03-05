"use client";

import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer,
} from "recharts";

interface RadarItem {
  subject: string;
  score: number;
}

export function MemberRadarChart({ data, color }: { data: RadarItem[]; color: string }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <RadarChart data={data}>
        <PolarGrid />
        <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12 }} />
        <PolarRadiusAxis domain={[0, 10]} tick={{ fontSize: 10 }} />
        <Radar name="평균" dataKey="score" stroke={color} fill={color} fillOpacity={0.3} />
      </RadarChart>
    </ResponsiveContainer>
  );
}
