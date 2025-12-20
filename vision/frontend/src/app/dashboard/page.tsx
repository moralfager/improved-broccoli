'use client';

import { useEffect, useState } from 'react';
import { clientApi } from '@/lib/api';
import { 
  Station, 
  DailyProfileResponse, 
  getEcoIndexColor, 
  AIR_STATE_LABELS, 
  POLLUTION_TYPE_LABELS,
  MICROCLIMATE_LABELS 
} from '@/types/station';
import MetricCard, { MetricCardSkeleton } from '@/components/Dashboard/MetricCard';
import DailyChart, { MultiLineChart } from '@/components/Charts/DailyChart';

export default function DashboardPage() {
  const [stations, setStations] = useState<Station[]>([]);
  const [selectedStationId, setSelectedStationId] = useState<string>('');
  const [dailyProfile, setDailyProfile] = useState<DailyProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);

  // Fetch all stations
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
    const interval = setInterval(fetchStations, 30000);
    return () => clearInterval(interval);
  }, []);

  // Fetch daily profile when station changes + periodic refresh
  useEffect(() => {
    if (!selectedStationId) return;

    const fetchProfile = async () => {
      setProfileLoading(true);
      try {
        const data = await clientApi.getDailyProfile(selectedStationId);
        setDailyProfile(data);
      } catch (err) {
        console.error('Failed to fetch daily profile:', err);
      } finally {
        setProfileLoading(false);
      }
    };

    fetchProfile();
    // Refresh profile every 30 seconds to get updated hourly data
    const interval = setInterval(fetchProfile, 30000);
    return () => clearInterval(interval);
  }, [selectedStationId]);

  const selectedStation = stations.find(s => s.station_id === selectedStationId);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="skeleton h-8 w-48 rounded mb-2" />
          <div className="skeleton h-4 w-64 rounded" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[...Array(4)].map((_, i) => <MetricCardSkeleton key={i} />)}
        </div>
      </div>
    );
  }

  // No stations have data yet
  if (stations.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="card p-8 text-center">
          <div className="text-6xl mb-4">📡</div>
          <h2 className="text-xl font-bold mb-2">Ожидание данных</h2>
          <p className="text-[var(--color-text-muted)] mb-4">
            Станции ещё не отправили данные. Запустите скрипт отправки.
          </p>
          <div className="bg-[var(--color-bg-primary)] rounded-lg p-4 text-left font-mono text-sm inline-block">
            <p className="text-[var(--color-accent-green)]">python scripts/send_mock_data.py --loop</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold">Панель мониторинга</h1>
          <p className="text-[var(--color-text-muted)]">Детальная информация о состоянии воздуха</p>
        </div>

        {/* Station Selector */}
        <div className="flex items-center gap-3">
          <label className="text-sm text-[var(--color-text-muted)]">Станция:</label>
          <select
            value={selectedStationId}
            onChange={(e) => setSelectedStationId(e.target.value)}
            className="bg-[var(--color-bg-card)] border border-[var(--border-color)] rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-[var(--color-accent-blue)] transition-colors"
          >
            {stations.map(station => (
              <option key={station.station_id} value={station.station_id}>
                {station.station_id} ({station.location.geo_cluster_label?.replace('_', ' ')})
              </option>
            ))}
          </select>
        </div>
      </div>

      {selectedStation && (
        <>
          {/* Last Update Time */}
          <div className="mb-6 flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
            <span className="w-2 h-2 rounded-full bg-[var(--color-accent-green)] animate-pulse" />
            Последнее обновление: {new Date(selectedStation.timestamp).toLocaleString('ru-RU')}
          </div>

          {/* Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <MetricCard
              title="Экологический индекс"
              value={selectedStation.analysis.eco_index}
              subtitle={`/ 100`}
              icon="🌿"
              color={getEcoIndexColor(selectedStation.analysis.eco_index)}
            />
            <MetricCard
              title="Состояние воздуха"
              value={AIR_STATE_LABELS[selectedStation.analysis.air_state]}
              icon="💨"
              color={getEcoIndexColor(selectedStation.analysis.eco_index)}
            />
            <MetricCard
              title="Тип загрязнения"
              value={POLLUTION_TYPE_LABELS[selectedStation.analysis.pollution_type]}
              icon="🔬"
              color="var(--color-accent-yellow)"
            />
            <MetricCard
              title="Микроклимат"
              value={MICROCLIMATE_LABELS[selectedStation.analysis.microclimate]}
              icon="🏠"
              color="var(--color-accent-blue)"
            />
          </div>

          {/* Sensor Values */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
            <MetricCard
              title="CO₂"
              value={selectedStation.gases.co2_ppm}
              subtitle="ppm"
              color={selectedStation.gases.co2_ppm > 1000 ? 'var(--color-accent-red)' : 'var(--color-accent-green)'}
            />
            <MetricCard
              title="Пыль"
              value={selectedStation.dust.dust_mg_m3.toFixed(3)}
              subtitle="мг/м³"
              color={selectedStation.dust.dust_mg_m3 > 0.1 ? 'var(--color-accent-orange)' : 'var(--color-accent-green)'}
            />
            <MetricCard
              title="Температура"
              value={selectedStation.env.temperature_c}
              subtitle="°C"
              color="var(--color-accent-blue)"
            />
            <MetricCard
              title="Влажность"
              value={selectedStation.env.humidity_pct}
              subtitle="%"
              color="var(--color-accent-blue)"
            />
            <MetricCard
              title="Давление"
              value={selectedStation.env.pressure_hpa.toFixed(0)}
              subtitle="гПа"
              color="var(--color-text-secondary)"
            />
            <MetricCard
              title="MQ-135"
              value={selectedStation.gases.mq135_raw}
              subtitle="raw"
              color={selectedStation.gases.mq135_raw > 2500 ? 'var(--color-accent-orange)' : 'var(--color-text-secondary)'}
            />
          </div>

          {/* Alerts */}
          {selectedStation.analysis.alerts.length > 0 && (
            <div className="card p-4 mb-8 border-[var(--color-accent-red)]/30">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <span className="text-xl">⚠️</span>
                Активные предупреждения
              </h3>
              <div className="flex flex-wrap gap-2">
                {selectedStation.analysis.alerts.map((alert, i) => (
                  <span 
                    key={i}
                    className="px-3 py-1.5 bg-[var(--color-accent-red)]/10 text-[var(--color-accent-red)] rounded-lg text-sm font-medium"
                  >
                    {alert.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Daily Profile Charts */}
          {dailyProfile && !profileLoading && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">
                  Суточный профиль 
                  <span className="text-sm font-normal text-[var(--color-text-muted)] ml-2">
                    {dailyProfile.city} • {dailyProfile.date}
                  </span>
                </h2>
                <div className="flex items-center gap-4 text-sm text-[var(--color-text-muted)]">
                  <span>📊 {dailyProfile.total_readings} измерений</span>
                  <span>⏱️ {dailyProfile.hours_with_data} часов с данными</span>
                </div>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                <DailyChart
                  data={dailyProfile.daily_profile}
                  dataKey="eco_index_avg"
                  title="Экологический индекс"
                  color="var(--color-accent-green)"
                  currentHour={dailyProfile.current_hour}
                />
                <DailyChart
                  data={dailyProfile.daily_profile}
                  dataKey="co2_ppm_avg"
                  title="Концентрация CO₂"
                  color="var(--color-accent-yellow)"
                  unit="ppm"
                  currentHour={dailyProfile.current_hour}
                />
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                <DailyChart
                  data={dailyProfile.daily_profile}
                  dataKey="dust_mg_m3_avg"
                  title="Концентрация пыли"
                  color="var(--color-accent-orange)"
                  unit="мг/м³"
                  currentHour={dailyProfile.current_hour}
                />
                <MultiLineChart
                  data={dailyProfile.daily_profile}
                  lines={[
                    { dataKey: 'temperature_c_avg', color: '#38bdf8', label: 'Температура °C' },
                    { dataKey: 'humidity_pct_avg', color: '#a78bfa', label: 'Влажность %' },
                  ]}
                  title="Температура и влажность"
                  currentHour={dailyProfile.current_hour}
                />
              </div>
            </div>
          )}

          {profileLoading && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="card p-4">
                  <div className="skeleton h-4 w-32 rounded mb-4" />
                  <div className="skeleton h-48 w-full rounded" />
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
