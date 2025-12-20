'use client';

import { ReactNode } from 'react';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: ReactNode;
  color?: string;
  trend?: 'up' | 'down' | 'stable';
  trendValue?: string;
}

export default function MetricCard({ 
  title, 
  value, 
  subtitle, 
  icon, 
  color = 'var(--color-accent-blue)',
  trend,
  trendValue 
}: MetricCardProps) {
  return (
    <div className="card p-5 relative overflow-hidden group">
      {/* Background glow effect */}
      <div 
        className="absolute -right-8 -top-8 w-24 h-24 rounded-full opacity-10 group-hover:opacity-20 transition-opacity"
        style={{ backgroundColor: color }}
      />
      
      <div className="relative">
        <div className="flex items-start justify-between mb-2">
          <p className="text-sm text-[var(--color-text-muted)]">{title}</p>
          {icon && (
            <span className="text-2xl opacity-70">{icon}</span>
          )}
        </div>
        
        <div className="flex items-baseline gap-2">
          <span 
            className="text-3xl font-bold"
            style={{ color }}
          >
            {value}
          </span>
          {subtitle && (
            <span className="text-sm text-[var(--color-text-muted)]">{subtitle}</span>
          )}
        </div>
        
        {trend && trendValue && (
          <div className="mt-2 flex items-center gap-1">
            <span className={`text-sm ${
              trend === 'up' ? 'text-green-400' : 
              trend === 'down' ? 'text-red-400' : 
              'text-[var(--color-text-muted)]'
            }`}>
              {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'}
              {trendValue}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export function MetricCardSkeleton() {
  return (
    <div className="card p-5">
      <div className="skeleton h-4 w-24 rounded mb-3" />
      <div className="skeleton h-8 w-32 rounded" />
    </div>
  );
}

