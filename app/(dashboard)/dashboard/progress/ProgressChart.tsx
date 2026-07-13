"use client";

import {
 ResponsiveContainer,
 LineChart,
 Line,
 XAxis,
 YAxis,
 Tooltip,
 CartesianGrid,
} from "recharts";

interface SnapshotPoint {
 id: string;
 snapshotDate: string;
 formattedDate: string;
 percentComplete: number;
 note: string | null;
 loggedBy: string;
}

interface ProgressChartProps {
 data: SnapshotPoint[];
}

export function ProgressChart({ data }: ProgressChartProps) {
 if (!data || data.length === 0) {
 return (
 <div className="flex h-64 w-full items-center justify-center rounded-xl border border-dashed border-white/10 bg-white/[0.01]">
 <p className="text-sm font-medium text-text-muted">
 No progress snapshots logged yet. Log a snapshot to track progress over time.
 </p>
 </div>
 );
 }

 return (
 <div className="h-72 w-full pt-4">
 <ResponsiveContainer width="100%" height="100%">
 <LineChart data={data} margin={{ top: 10, right: 30, left: -10, bottom: 0 }}>
 <defs>
 <linearGradient id="lineGlow" x1="0" y1="0" x2="0" y2="1">
 <stop offset="0%" stopColor="#1fb6a6" stopOpacity={0.4} />
 <stop offset="100%" stopColor="#1fb6a6" stopOpacity={0.0} />
 </linearGradient>
 </defs>
 <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.06)" vertical={false} />
 <XAxis
 dataKey="formattedDate"
 stroke="#94a3b8"
 fontSize={11}
 tickLine={false}
 axisLine={{ stroke: "rgba(255, 255, 255, 0.1)" }}
 />
 <YAxis
 domain={[0, 100]}
 stroke="#94a3b8"
 fontSize={11}
 tickLine={false}
 axisLine={{ stroke: "rgba(255, 255, 255, 0.1)" }}
 tickFormatter={(value) => `${value}%`}
 />
 <Tooltip
 content={({ active, payload }) => {
 if (active && payload && payload.length) {
 const point = payload[0].payload as SnapshotPoint;
 return (
 <div className="rounded-xl border border-white/15 bg-slate-900/90 p-3 shadow-2xl ">
 <p className="font-mono text-[10px] uppercase text-text-muted">
 {point.formattedDate}
 </p>
 <p className="font-display text-lg font-bold text-flow-teal">
 {point.percentComplete}% Complete
 </p>
 {point.note && (
 <p className="mt-1 text-xs text-text-primary italic">
 &quot;{point.note}&quot;
 </p>
 )}
 <p className="mt-1 font-mono text-[10px] text-text-muted">
 Logged by: {point.loggedBy}
 </p>
 </div>
 );
 }
 return null;
 }}
 />
 <Line
 type="monotone"
 dataKey="percentComplete"
 stroke="#1fb6a6"
 strokeWidth={3}
 dot={{ r: 5, fill: "#1fb6a6", stroke: "#0f172a", strokeWidth: 2 }}
 activeDot={{ r: 8, fill: "#1fb6a6", stroke: "#ffffff", strokeWidth: 2 }}
 />
 </LineChart>
 </ResponsiveContainer>
 </div>
 );
}
