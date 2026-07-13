"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from "recharts";

interface WeatherChartProps {
  hourly: {
    time: string[];
    temperature_2m: number[];
    precipitation_probability: number[];
  };
}

export function WeatherChart({ hourly }: WeatherChartProps) {
  // Take the next 24 hours
  const now = new Date();
  const currentIndex = hourly.time.findIndex(t => new Date(t) > now);
  const startIndex = Math.max(0, currentIndex - 1);
  const data = hourly.time.slice(startIndex, startIndex + 24).map((time, i) => ({
    time: new Date(time).toLocaleTimeString("en-US", { hour: "numeric", hour12: true }),
    temperature: hourly.temperature_2m[startIndex + i],
    precipitation: hourly.precipitation_probability[startIndex + i]
  }));

  return (
    <div className="h-[300px] w-full mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 0, left: -20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
          <XAxis 
            dataKey="time" 
            stroke="rgba(255,255,255,0.3)" 
            tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 12 }} 
            axisLine={false}
            tickLine={false}
          />
          <YAxis 
            yAxisId="left" 
            stroke="rgba(255,255,255,0.3)" 
            tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            domain={['auto', 'auto']}
          />
          <YAxis 
            yAxisId="right" 
            orientation="right" 
            stroke="rgba(255,255,255,0.3)" 
            tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            domain={[0, 100]}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'rgba(10,15,20,0.9)', 
              borderColor: 'rgba(255,255,255,0.1)',
              borderRadius: '8px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
            }} 
            itemStyle={{ fontSize: '13px' }}
            labelStyle={{ color: 'rgba(255,255,255,0.7)', marginBottom: '4px' }}
          />
          <Legend wrapperStyle={{ fontSize: '12px', opacity: 0.8 }} />
          <Line 
            yAxisId="left" 
            type="monotone" 
            dataKey="temperature" 
            name="Temperature (°C)"
            stroke="#1fb6a6" 
            strokeWidth={3} 
            dot={false}
            activeDot={{ r: 6, fill: "#1fb6a6", stroke: "rgba(31,182,166,0.3)", strokeWidth: 4 }}
          />
          <Line 
            yAxisId="right" 
            type="monotone" 
            dataKey="precipitation" 
            name="Precipitation Probability (%)"
            stroke="#e8a33d" 
            strokeWidth={3}
            dot={false}
            activeDot={{ r: 6, fill: "#e8a33d", stroke: "rgba(232,163,61,0.3)", strokeWidth: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
