"use client";

import { RadialBarChart, RadialBar, ResponsiveContainer, PolarAngleAxis } from "recharts";

interface ProjectCompletionChartProps {
 percentComplete: number;
}

export function ProjectCompletionChart({ percentComplete }: ProjectCompletionChartProps) {
 const data = [
 {
 name: "Completion",
 value: percentComplete,
 fill: "#1FB6A6", // flow-teal
 },
 ];

 return (
 <div className="relative h-48 w-full">
 <ResponsiveContainer width="100%" height="100%">
 <RadialBarChart
 cx="50%"
 cy="50%"
 innerRadius="55%"
 outerRadius="80%"
 barSize={14}
 data={data}
 startAngle={90}
 endAngle={-270}
 >
 <PolarAngleAxis
 type="number"
 domain={[0, 100]}
 angleAxisId={0}
 tick={false}
 />
 <RadialBar
 background={{ fill: "#182329" }} // bg-panel-raised
 dataKey="value"
 cornerRadius={8}
 />
 </RadialBarChart>
 </ResponsiveContainer>
 <div className="absolute inset-0 flex flex-col items-center justify-center">
 <span className="font-display text-3xl font-bold tabular-nums text-text-primary drop-shadow-[0_0_12px_rgba(255,255,255,0.3)]">
 {percentComplete}%
 </span>
 <span className="mt-0.5 text-xs font-medium tracking-wide text-text-muted">Complete</span>
 </div>
 </div>
 );
}
