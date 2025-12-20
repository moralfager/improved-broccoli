'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
  Legend,
  ReferenceLine,
} from 'recharts';
import { HourlyData } from '@/types/station';

interface DailyChartProps {
  data: HourlyData[];
  dataKey: keyof HourlyData;
  title: string;
  color: string;
  unit?: string;
  showArea?: boolean;
  currentHour?: number;
}

export default function DailyChart({ 
  data, 
  dataKey, 
  title, 
  color, 
  unit = '',
  showArea = true,
  currentHour
}: DailyChartProps) {
  const formatHour = (hour: number) => `${hour.toString().padStart(2, '0')}:00`;
  
  // Count hours with data
  const hoursWithData = data.filter(d => d.has_data).length;
  
  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number | null; payload: HourlyData }>; label?: number }) => {
    if (active && payload && payload.length) {
      const hourData = payload[0].payload;
      const value = payload[0].value;
      
      if (!hourData.has_data || value === null) {
        return (
          <div className="glass rounded-lg p-3 border border-[var(--border-color)]">
            <p className="text-sm text-[var(--color-text-muted)]">{formatHour(label || 0)}</p>
            <p className="text-sm text-[var(--color-text-muted)]">Нет данных</p>
          </div>
        );
      }
      
      return (
        <div className="glass rounded-lg p-3 border border-[var(--border-color)]">
          <p className="text-sm text-[var(--color-text-muted)]">{formatHour(label || 0)}</p>
          <p className="text-lg font-bold" style={{ color }}>
            {typeof value === 'number' 
              ? value.toFixed(dataKey === 'dust_mg_m3_avg' ? 4 : 1) 
              : value}
            {unit && <span className="text-sm ml-1">{unit}</span>}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-[var(--color-text-secondary)]">{title}</h3>
        {hoursWithData > 0 && (
          <span className="text-xs text-[var(--color-text-muted)]">
            {hoursWithData}ч данных
          </span>
        )}
      </div>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
            <defs>
              <linearGradient id={`gradient-${dataKey}-${title}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke="var(--border-color)" 
              vertical={false}
            />
            <XAxis 
              dataKey="hour" 
              tickFormatter={formatHour}
              stroke="var(--color-text-muted)"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              interval={3}
            />
            <YAxis 
              stroke="var(--color-text-muted)"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => dataKey === 'dust_mg_m3_avg' ? v.toFixed(3) : v}
            />
            <Tooltip content={<CustomTooltip />} />
            {/* Current hour marker */}
            {currentHour !== undefined && (
              <ReferenceLine 
                x={currentHour} 
                stroke="var(--color-accent-green)" 
                strokeDasharray="3 3"
                strokeWidth={2}
              />
            )}
            <Area
              type="monotone"
              dataKey={dataKey}
              stroke={color}
              strokeWidth={2}
              fill={showArea ? `url(#gradient-${dataKey}-${title})` : 'none'}
              dot={(props) => {
                const { cx, cy, payload } = props;
                if (!payload.has_data) return null;
                return (
                  <circle 
                    cx={cx} 
                    cy={cy} 
                    r={3} 
                    fill={color}
                    stroke="white"
                    strokeWidth={1}
                  />
                );
              }}
              activeDot={{ r: 5, fill: color, strokeWidth: 2, stroke: 'white' }}
              connectNulls={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      {hoursWithData === 0 && (
        <div className="text-center text-sm text-[var(--color-text-muted)] mt-2">
          Ожидание данных...
        </div>
      )}
    </div>
  );
}

interface MultiLineChartProps {
  data: HourlyData[];
  lines: Array<{
    dataKey: keyof HourlyData;
    color: string;
    label: string;
  }>;
  title: string;
  currentHour?: number;
}

export function MultiLineChart({ data, lines, title, currentHour }: MultiLineChartProps) {
  const formatHour = (hour: number) => `${hour.toString().padStart(2, '0')}:00`;
  const hoursWithData = data.filter(d => d.has_data).length;

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-[var(--color-text-secondary)]">{title}</h3>
        {hoursWithData > 0 && (
          <span className="text-xs text-[var(--color-text-muted)]">
            {hoursWithData}ч данных
          </span>
        )}
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke="var(--border-color)" 
              vertical={false}
            />
            <XAxis 
              dataKey="hour" 
              tickFormatter={formatHour}
              stroke="var(--color-text-muted)"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              interval={3}
            />
            <YAxis 
              stroke="var(--color-text-muted)"
              fontSize={10}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip 
              contentStyle={{ 
                background: 'var(--color-bg-card)', 
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
              }}
              labelFormatter={formatHour}
              formatter={(value) => value === null ? 'Нет данных' : typeof value === 'number' ? value.toFixed(1) : value}
            />
            <Legend 
              wrapperStyle={{ fontSize: '12px' }}
              iconType="circle"
              iconSize={8}
            />
            {/* Current hour marker */}
            {currentHour !== undefined && (
              <ReferenceLine 
                x={currentHour} 
                stroke="var(--color-accent-green)" 
                strokeDasharray="3 3"
                strokeWidth={2}
              />
            )}
            {lines.map(line => (
              <Line
                key={line.dataKey}
                type="monotone"
                dataKey={line.dataKey}
                stroke={line.color}
                strokeWidth={2}
                dot={false}
                name={line.label}
                connectNulls={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      {hoursWithData === 0 && (
        <div className="text-center text-sm text-[var(--color-text-muted)] mt-2">
          Ожидание данных...
        </div>
      )}
    </div>
  );
}
