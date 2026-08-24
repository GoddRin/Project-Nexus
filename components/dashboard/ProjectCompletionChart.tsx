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
      fill: "url(#scicRadialGrad)",
    },
  ];

  return (
    <div className="relative h-52 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart
          cx="50%"
          cy="50%"
          innerRadius="60%"
          outerRadius="86%"
          barSize={16}
          data={data}
          startAngle={90}
          endAngle={-270}
        >
          <defs>
            <linearGradient id="scicRadialGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#0077CC" />
              <stop offset="60%" stopColor="#0284C7" />
              <stop offset="100%" stopColor="#00D2FF" />
            </linearGradient>
          </defs>
          <PolarAngleAxis
            type="number"
            domain={[0, 100]}
            angleAxisId={0}
            tick={false}
          />
          <RadialBar
            background={{ fill: "rgba(15, 23, 42, 0.08)" }}
            dataKey="value"
            cornerRadius={10}
          />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="font-display text-4xl font-bold tabular-nums text-text-primary tracking-tight">
          {percentComplete}%
        </span>
        <div className="flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full bg-scic-blue/10 dark:bg-scic-cyan/10 border border-scic-blue/20 dark:border-scic-cyan/20">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-scic-blue dark:text-scic-cyan">
            S-Curve Actual
          </span>
        </div>
      </div>
    </div>
  );
}
