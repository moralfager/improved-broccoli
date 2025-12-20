'use client';

import { useEffect, useState } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts';
import { clientApi } from '@/lib/api';
import { 
  Station, 
  getEcoIndexColor, 
  AIR_STATE_LABELS, 
  POLLUTION_TYPE_LABELS,
  AirState,
  PollutionType 
} from '@/types/station';

const POLLUTION_COLORS: Record<PollutionType, string> = {
  clean_air: '#22c55e',
  dust: '#f59e0b',
  smoke: '#6b7280',
  voc_chemicals: '#8b5cf6',
  gas_leak: '#ef4444',
  stuffy: '#3b82f6',
};

const AIR_STATE_COLORS: Record<AirState, string> = {
  clean: '#22c55e',
  moderate: '#eab308',
  polluted: '#f97316',
  danger: '#ef4444',
};

export default function AnalysisPage() {
  const [stations, setStations] = useState<Station[]>([]);
  const [selectedStationId, setSelectedStationId] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStations = async () => {
      try {
        const data = await clientApi.getLatest();
        setStations(data.stations);
        if (data.stations.length > 0 && !selectedStationId) {
          setSelectedStationId(data.stations[0].station_id);
        }
      } catch (err) {
        console.error('Failed to fetch stations:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStations();
  }, []);

  const selectedStation = stations.find(s => s.station_id === selectedStationId);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="w-12 h-12 border-4 border-[var(--color-accent-green)] border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold">Аналитика</h1>
          <p className="text-[var(--color-text-muted)]">
            Детальный анализ состояния воздуха и типов загрязнений
          </p>
        </div>

        <select
          value={selectedStationId}
          onChange={(e) => setSelectedStationId(e.target.value)}
          className="bg-[var(--color-bg-card)] border border-[var(--border-color)] rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-[var(--color-accent-blue)]"
        >
          {stations.map(station => (
            <option key={station.station_id} value={station.station_id}>
              {station.station_id}
            </option>
          ))}
        </select>
      </div>

      {selectedStation && (
        <div className="space-y-8">
          {/* Pollution Type Analysis */}
          <section>
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <span>🔬</span>
              Анализ типа загрязнения
            </h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Pollution Type Probabilities Bar Chart */}
              <div className="card p-6">
                <h3 className="text-sm font-semibold mb-4 text-[var(--color-text-secondary)]">
                  Вероятности типов загрязнения
                </h3>
                <PollutionProbaChart station={selectedStation} />
              </div>

              {/* Pie Chart */}
              <div className="card p-6">
                <h3 className="text-sm font-semibold mb-4 text-[var(--color-text-secondary)]">
                  Распределение вероятностей
                </h3>
                <PollutionPieChart station={selectedStation} />
              </div>
            </div>

            {/* Interpretation */}
            <div className="card p-6 mt-4">
              <h3 className="text-sm font-semibold mb-3 text-[var(--color-text-secondary)]">
                Интерпретация результатов
              </h3>
              <PollutionInterpretation station={selectedStation} />
            </div>
          </section>

          {/* Air State Analysis */}
          <section>
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <span>💨</span>
              Классификация состояния воздуха
            </h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Air State Probabilities */}
              <div className="card p-6">
                <h3 className="text-sm font-semibold mb-4 text-[var(--color-text-secondary)]">
                  Вероятности состояний
                </h3>
                <AirStateChart station={selectedStation} />
              </div>

              {/* Current State Display */}
              <div className="card p-6">
                <h3 className="text-sm font-semibold mb-4 text-[var(--color-text-secondary)]">
                  Текущее состояние
                </h3>
                <CurrentStateDisplay station={selectedStation} />
              </div>
            </div>
          </section>

          {/* Sensor Radar */}
          <section>
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <span>📊</span>
              Профиль датчиков
            </h2>
            
            <div className="card p-6">
              <SensorRadarChart station={selectedStation} />
            </div>
          </section>

          {/* Comparative Analysis */}
          <section>
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <span>📈</span>
              Сравнительный анализ станций
            </h2>
            
            <div className="card p-6">
              <StationsComparison stations={stations} />
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function PollutionProbaChart({ station }: { station: Station }) {
  const data = Object.entries(station.analysis.pollution_type_proba).map(([key, value]) => ({
    name: POLLUTION_TYPE_LABELS[key as PollutionType],
    value: Math.round(value * 100),
    fill: POLLUTION_COLORS[key as PollutionType],
  }));

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 80, right: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" horizontal={false} />
          <XAxis 
            type="number" 
            domain={[0, 100]}
            stroke="var(--color-text-muted)"
            fontSize={10}
            tickFormatter={(v) => `${v}%`}
          />
          <YAxis 
            type="category" 
            dataKey="name" 
            stroke="var(--color-text-muted)"
            fontSize={11}
            width={75}
          />
          <Tooltip 
            formatter={(value: number) => [`${value}%`, 'Вероятность']}
            contentStyle={{ 
              background: 'var(--color-bg-card)', 
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
            }}
          />
          <Bar dataKey="value" radius={[0, 4, 4, 0]}>
            {data.map((entry, index) => (
              <Cell key={index} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function PollutionPieChart({ station }: { station: Station }) {
  const data = Object.entries(station.analysis.pollution_type_proba)
    .filter(([, value]) => value > 0.05)
    .map(([key, value]) => ({
      name: POLLUTION_TYPE_LABELS[key as PollutionType],
      value: Math.round(value * 100),
      fill: POLLUTION_COLORS[key as PollutionType],
    }));

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={90}
            paddingAngle={2}
            dataKey="value"
            label={({ name, value }) => `${name}: ${value}%`}
            labelLine={false}
          >
            {data.map((entry, index) => (
              <Cell key={index} fill={entry.fill} />
            ))}
          </Pie>
          <Tooltip 
            formatter={(value: number) => [`${value}%`, 'Вероятность']}
            contentStyle={{ 
              background: 'var(--color-bg-card)', 
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

function PollutionInterpretation({ station }: { station: Station }) {
  const { pollution_type, pollution_type_proba } = station.analysis;
  
  const interpretations: Record<PollutionType, string> = {
    clean_air: `Воздух чистый. Все показатели в пределах нормы. Концентрация CO₂: ${station.gases.co2_ppm} ppm (норма < 600 ppm).`,
    dust: `Преобладает пылевое загрязнение. Концентрация пыли: ${station.dust.dust_mg_m3.toFixed(3)} мг/м³. Возможные источники: дорожное движение, строительные работы, природные факторы.`,
    smoke: `Обнаружены признаки дыма. Высокие показатели MQ-135 (${station.gases.mq135_raw}) в сочетании с повышенной концентрацией пыли указывают на продукты горения.`,
    voc_chemicals: `Повышенная концентрация летучих органических соединений (VOC). Показания MQ-135: ${station.gases.mq135_raw}. Возможные источники: промышленные выбросы, растворители, краски.`,
    gas_leak: `Внимание! Обнаружены признаки утечки горючих газов. Показания MQ-5: ${station.gases.mq5_raw}. Рекомендуется проверить газовое оборудование.`,
    stuffy: `Помещение плохо проветривается. CO₂: ${station.gases.co2_ppm} ppm, влажность: ${station.env.humidity_pct}%. Рекомендуется обеспечить приток свежего воздуха.`,
  };

  const confidence = pollution_type_proba[pollution_type];

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-4">
        <div 
          className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
          style={{ backgroundColor: `${POLLUTION_COLORS[pollution_type]}20` }}
        >
          {pollution_type === 'clean_air' ? '✨' : 
           pollution_type === 'dust' ? '🌫️' :
           pollution_type === 'smoke' ? '💨' :
           pollution_type === 'voc_chemicals' ? '⚗️' :
           pollution_type === 'gas_leak' ? '⚠️' : '🏠'}
        </div>
        <div>
          <h4 className="font-semibold text-lg" style={{ color: POLLUTION_COLORS[pollution_type] }}>
            {POLLUTION_TYPE_LABELS[pollution_type]}
          </h4>
          <p className="text-sm text-[var(--color-text-muted)]">
            Уверенность модели: {Math.round(confidence * 100)}%
          </p>
        </div>
      </div>
      
      <p className="text-[var(--color-text-secondary)] leading-relaxed">
        {interpretations[pollution_type]}
      </p>

      {/* Additional recommendations based on pollution type */}
      <div className="pt-4 border-t border-[var(--border-color)]">
        <h5 className="text-sm font-semibold mb-2">Рекомендации:</h5>
        <ul className="text-sm text-[var(--color-text-muted)] space-y-1">
          {pollution_type === 'dust' && (
            <>
              <li>• Используйте очиститель воздуха с HEPA-фильтром</li>
              <li>• Регулярно проводите влажную уборку</li>
            </>
          )}
          {pollution_type === 'smoke' && (
            <>
              <li>• Закройте окна и используйте рециркуляцию воздуха</li>
              <li>• При необходимости используйте маску</li>
            </>
          )}
          {pollution_type === 'stuffy' && (
            <>
              <li>• Откройте окна для проветривания</li>
              <li>• Используйте вентилятор или систему вентиляции</li>
            </>
          )}
          {pollution_type === 'gas_leak' && (
            <>
              <li>• Немедленно проветрите помещение</li>
              <li>• Не используйте открытый огонь</li>
              <li>• Обратитесь в газовую службу</li>
            </>
          )}
          {pollution_type === 'clean_air' && (
            <li>• Продолжайте поддерживать текущий уровень вентиляции</li>
          )}
        </ul>
      </div>
    </div>
  );
}

function AirStateChart({ station }: { station: Station }) {
  const data = Object.entries(station.analysis.air_state_proba).map(([key, value]) => ({
    name: AIR_STATE_LABELS[key as AirState],
    value: Math.round(value * 100),
    fill: AIR_STATE_COLORS[key as AirState],
  }));

  return (
    <div className="h-48">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ left: 10, right: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
          <XAxis 
            dataKey="name" 
            stroke="var(--color-text-muted)"
            fontSize={11}
          />
          <YAxis 
            domain={[0, 100]}
            stroke="var(--color-text-muted)"
            fontSize={10}
            tickFormatter={(v) => `${v}%`}
          />
          <Tooltip 
            formatter={(value: number) => [`${value}%`, 'Вероятность']}
            contentStyle={{ 
              background: 'var(--color-bg-card)', 
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
            }}
          />
          <Bar dataKey="value" radius={[4, 4, 0, 0]}>
            {data.map((entry, index) => (
              <Cell key={index} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function CurrentStateDisplay({ station }: { station: Station }) {
  const { eco_index, air_state, microclimate, microclimate_flags, alerts } = station.analysis;

  return (
    <div className="space-y-4">
      {/* Eco Index Gauge */}
      <div className="flex items-center justify-center">
        <div 
          className="relative w-32 h-32 rounded-full flex items-center justify-center"
          style={{ 
            background: `conic-gradient(${getEcoIndexColor(eco_index)} ${eco_index * 3.6}deg, var(--color-bg-primary) 0deg)`,
          }}
        >
          <div className="absolute inset-3 rounded-full bg-[var(--color-bg-card)] flex items-center justify-center flex-col">
            <span className="text-3xl font-bold" style={{ color: getEcoIndexColor(eco_index) }}>
              {eco_index}
            </span>
            <span className="text-xs text-[var(--color-text-muted)]">из 100</span>
          </div>
        </div>
      </div>

      {/* State Labels */}
      <div className="grid grid-cols-2 gap-3">
        <div className="text-center p-3 rounded-lg bg-[var(--color-bg-primary)]">
          <p className="text-xs text-[var(--color-text-muted)] mb-1">Состояние</p>
          <p className="font-semibold" style={{ color: getEcoIndexColor(eco_index) }}>
            {AIR_STATE_LABELS[air_state]}
          </p>
        </div>
        <div className="text-center p-3 rounded-lg bg-[var(--color-bg-primary)]">
          <p className="text-xs text-[var(--color-text-muted)] mb-1">Микроклимат</p>
          <p className="font-semibold">{microclimate}</p>
        </div>
      </div>

      {/* Flags */}
      {microclimate_flags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {microclimate_flags.map((flag, i) => (
            <span 
              key={i}
              className="px-2 py-1 bg-[var(--color-accent-blue)]/10 text-[var(--color-accent-blue)] rounded text-xs"
            >
              {flag.replace(/_/g, ' ')}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function SensorRadarChart({ station }: { station: Station }) {
  // Normalize sensor values for radar chart (0-100 scale)
  const data = [
    { 
      sensor: 'CO₂', 
      value: Math.min(100, (station.gases.co2_ppm / 2000) * 100),
      fullMark: 100 
    },
    { 
      sensor: 'Пыль', 
      value: Math.min(100, (station.dust.dust_mg_m3 / 0.3) * 100),
      fullMark: 100 
    },
    { 
      sensor: 'MQ-135', 
      value: Math.min(100, (station.gases.mq135_raw / 4095) * 100),
      fullMark: 100 
    },
    { 
      sensor: 'MQ-5', 
      value: Math.min(100, (station.gases.mq5_raw / 4095) * 100),
      fullMark: 100 
    },
    { 
      sensor: 'Влажность', 
      value: station.env.humidity_pct,
      fullMark: 100 
    },
  ];

  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data}>
          <PolarGrid stroke="var(--border-color)" />
          <PolarAngleAxis 
            dataKey="sensor" 
            tick={{ fill: 'var(--color-text-secondary)', fontSize: 12 }}
          />
          <PolarRadiusAxis 
            angle={30} 
            domain={[0, 100]}
            tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }}
          />
          <Radar
            name="Показатели"
            dataKey="value"
            stroke="var(--color-accent-green)"
            fill="var(--color-accent-green)"
            fillOpacity={0.3}
          />
          <Tooltip 
            formatter={(value: number) => [`${value.toFixed(1)}%`, 'Уровень']}
            contentStyle={{ 
              background: 'var(--color-bg-card)', 
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
            }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

function StationsComparison({ stations }: { stations: Station[] }) {
  const data = stations.map(s => ({
    name: s.station_id.split('-').pop(),
    eco_index: s.analysis.eco_index,
    co2: Math.round(s.gases.co2_ppm / 20), // Normalize for chart
    dust: Math.round(s.dust.dust_mg_m3 * 1000),
  }));

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ left: 10, right: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
          <XAxis 
            dataKey="name" 
            stroke="var(--color-text-muted)"
            fontSize={11}
          />
          <YAxis 
            stroke="var(--color-text-muted)"
            fontSize={10}
          />
          <Tooltip 
            contentStyle={{ 
              background: 'var(--color-bg-card)', 
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
            }}
          />
          <Bar dataKey="eco_index" name="Eco Index" fill="var(--color-accent-green)" radius={[4, 4, 0, 0]} />
          <Bar dataKey="co2" name="CO₂ (÷20)" fill="var(--color-accent-yellow)" radius={[4, 4, 0, 0]} />
          <Bar dataKey="dust" name="Пыль (×1000)" fill="var(--color-accent-orange)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

