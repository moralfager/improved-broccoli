"use client";

interface Period {
  id: number;
  name: string;
  startDate: string;
  endDate?: string;
  color: string;
  order: number;
}

interface PeriodVisualizerProps {
  date: Date;
  periods: Period[];
}

export function PeriodVisualizer({ date, periods }: PeriodVisualizerProps) {
  const getPeriodForDate = (checkDate: Date) => {
    for (const period of periods) {
      const start = new Date(period.startDate);
      const end = period.endDate ? new Date(period.endDate) : new Date('2099-12-31');
      
      if (checkDate >= start && checkDate <= end) {
        return period;
      }
    }
    return null;
  };

  const period = getPeriodForDate(date);

  if (!period) {
    return <div className="w-full h-2 bg-gray-100 rounded-full" />;
  }

  return (
    <div 
      className="w-full h-2 rounded-full transition-all"
      style={{ backgroundColor: period.color }}
      title={period.name}
    />
  );
}

export function PeriodLegend({ periods }: { periods: Period[] }) {
  return (
    <div className="flex flex-wrap gap-3">
      {periods.map((period) => (
        <div key={period.id} className="flex items-center gap-2">
          <div 
            className="w-4 h-4 rounded-full"
            style={{ backgroundColor: period.color }}
          />
          <span className="text-sm text-muted-foreground">{period.name}</span>
        </div>
      ))}
    </div>
  );
}

export function getPeriodGradient(date: Date, periods: Period[]): string {
  const period = periods.find(p => {
    const start = new Date(p.startDate);
    const end = p.endDate ? new Date(p.endDate) : new Date('2099-12-31');
    return date >= start && date <= end;
  });
  
  return period ? period.color : '#f3f4f6';
}

