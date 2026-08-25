"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { getWeatherInfo } from "@/lib/weather/fetchWeather";

interface WeatherChartProps {
  hourly: {
    time: string[];
    temperature_2m: number[];
    precipitation_probability: number[];
    weather_code?: number[];
  };
}

const CustomHourlyTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const dataPoint = payload[0]?.payload;
    const temp = payload.find((p: any) => p.dataKey === "temperature")?.value;
    const precip = payload.find((p: any) => p.dataKey === "precipitation")?.value;
    const condition = dataPoint?.condition || "";

    return (
      <div className="rounded-xl border border-border-hairline bg-slate-950/95 p-3 shadow-2xl backdrop-blur-md min-w-[170px]">
        <p className="mb-1.5 font-bold text-xs text-text-primary border-b border-border-hairline pb-1">
          {label}
        </p>
        <div className="space-y-1 text-xs">
          <div className="flex items-center justify-between gap-3">
            <span className="text-text-muted">Temperature:</span>
            <span className="font-bold text-flow-teal">{temp}°C</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-text-muted">Precipitation:</span>
            <span className="font-bold text-signal-amber">{precip}%</span>
          </div>
          {condition && (
            <div className="flex items-center justify-between gap-3 pt-1 border-t border-border-hairline/60">
              <span className="text-text-muted">Condition:</span>
              <span className="font-semibold text-text-primary">{condition}</span>
            </div>
          )}
        </div>
      </div>
    );
  }
  return null;
};

export function WeatherChart({ hourly }: WeatherChartProps) {
  const now = new Date();
  // Find current hour index in local timeline
  let currentIndex = hourly.time.findIndex((t) => {
    const d = new Date(t);
    return d.getTime() >= now.getTime() - 3600000;
  });
  if (currentIndex === -1) currentIndex = 0;

  const data = hourly.time.slice(currentIndex, currentIndex + 24).map((time, i) => {
    const realIdx = currentIndex + i;
    const code = hourly.weather_code ? hourly.weather_code[realIdx] : 0;
    const rec = getWeatherInfo(code);

    return {
      time: new Date(time).toLocaleTimeString("en-US", { hour: "numeric", hour12: true }),
      temperature: hourly.temperature_2m[realIdx],
      precipitation: hourly.precipitation_probability[realIdx],
      condition: rec.conditionLabel,
    };
  });

  return (
    <div className="h-[300px] w-full mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
          <XAxis 
            dataKey="time" 
            stroke="rgba(255,255,255,0.3)" 
            tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 11 }} 
            axisLine={false}
            tickLine={false}
          />
          <YAxis 
            yAxisId="left" 
            stroke="rgba(255,255,255,0.3)" 
            tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            domain={['auto', 'auto']}
          />
          <YAxis 
            yAxisId="right" 
            orientation="right" 
            stroke="rgba(255,255,255,0.3)" 
            tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            domain={[0, 100]}
          />
          <Tooltip content={<CustomHourlyTooltip />} />
          <Legend wrapperStyle={{ fontSize: '12px', opacity: 0.8, paddingTop: '8px' }} />
          <Line 
            yAxisId="left" 
            type="monotone" 
            dataKey="temperature" 
            name="Temperature (°C)"
            stroke="#1fb6a6" 
            strokeWidth={3} 
            dot={false}
            activeDot={{ r: 5, fill: "#1fb6a6", stroke: "rgba(31,182,166,0.4)", strokeWidth: 4 }}
          />
          <Line 
            yAxisId="right" 
            type="monotone" 
            dataKey="precipitation" 
            name="Precipitation Probability (%)"
            stroke="#e8a33d" 
            strokeWidth={3}
            dot={false}
            activeDot={{ r: 5, fill: "#e8a33d", stroke: "rgba(232,163,61,0.4)", strokeWidth: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
