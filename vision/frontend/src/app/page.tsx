'use client';

import { useEffect, useState } from 'react';
import MapWrapper from '@/components/Map/MapWrapper';
import { Station, LatestResponse, getEcoIndexColor, AIR_STATE_LABELS, POLLUTION_TYPE_LABELS, MICROCLIMATE_LABELS } from '@/types/station';
import { clientApi, StationStatusInfo } from '@/lib/api';

export default function HomePage() {
  const [stations, setStations] = useState<Station[]>([]);
  const [statuses, setStatuses] = useState<StationStatusInfo[]>([]);
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [mounted, setMounted] = useState(false);

  // Handle client-side mounting
  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchData = async () => {
    try {
      const [latestData, statusData] = await Promise.all([
        clientApi.getLatest().catch(() => ({ stations: [] })),
        clientApi.getStatus().catch(() => [])
      ]);
      
      setStations(latestData.stations);
      setStatuses(statusData);
      setLastRefresh(new Date());
      setError(null);
    } catch (err) {
      setError('Не удалось загрузить данные');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleStationClick = (station: Station) => {
    setSelectedStation(station);
  };

  const noDataStations = statuses.filter(s => s.status === 'no_data');
  const offlineStations = statuses.filter(s => s.status === 'offline');

  return (
    <div className="h-[calc(100vh-4rem)] flex">
      {/* Map Area */}
      <div className="flex-1 relative">
        {loading ? (
          <div className="w-full h-full flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 border-4 border-[var(--color-accent-green)] border-t-transparent rounded-full animate-spin" />
              <span className="text-[var(--color-text-muted)]">Загрузка данных...</span>
            </div>
          </div>
        ) : error ? (
          <div className="w-full h-full flex items-center justify-center">
            <div className="card p-6 text-center max-w-md">
              <div className="text-4xl mb-4">⚠️</div>
              <h2 className="text-xl font-bold mb-2">Ошибка загрузки</h2>
              <p className="text-[var(--color-text-muted)] mb-4">{error}</p>
              <p className="text-sm text-[var(--color-text-muted)]">
                Убедитесь, что backend API запущен на localhost:8000
              </p>
            </div>
          </div>
        ) : stations.length === 0 ? (
          <div className="w-full h-full flex items-center justify-center">
            <div className="card p-8 text-center max-w-lg">
              <div className="text-6xl mb-4">📡</div>
              <h2 className="text-xl font-bold mb-2">Ожидание данных от станций</h2>
              <p className="text-[var(--color-text-muted)] mb-4">
                Станции ещё не отправили данные. Запустите скрипт отправки:
              </p>
              <div className="bg-[var(--color-bg-primary)] rounded-lg p-4 text-left font-mono text-sm mb-4">
                <p className="text-[var(--color-text-muted)]"># Установите зависимости</p>
                <p className="text-[var(--color-accent-green)]">pip install requests</p>
                <p className="text-[var(--color-text-muted)] mt-2"># Запустите скрипт</p>
                <p className="text-[var(--color-accent-green)]">python scripts/send_mock_data.py</p>
              </div>
              <div className="flex gap-2 justify-center">
                {statuses.map(s => (
                  <div key={s.station_id} className="flex items-center gap-1 px-2 py-1 rounded bg-[var(--color-bg-card)]">
                    <span className={`w-2 h-2 rounded-full ${
                      s.status === 'online' ? 'bg-green-500' : 
                      s.status === 'offline' ? 'bg-yellow-500' : 
                      'bg-gray-500'
                    }`} />
                    <span className="text-xs">{s.station_id.split('-').pop()}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <MapWrapper stations={stations} onStationClick={handleStationClick} />
        )}

        {/* Legend */}
        {stations.length > 0 && (
          <div className="absolute bottom-6 left-6 glass rounded-xl p-4 z-[1000]">
            <h4 className="text-sm font-semibold mb-3 text-[var(--color-text-primary)]">Индекс качества воздуха</h4>
            <div className="flex flex-col gap-2">
              {(['clean', 'moderate', 'polluted', 'danger'] as const).map((state) => (
                <div key={state} className="flex items-center gap-2">
                  <div 
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: getEcoIndexColor(state === 'clean' ? 10 : state === 'moderate' ? 40 : state === 'polluted' ? 60 : 85) }}
                  />
                  <span className="text-xs text-[var(--color-text-secondary)]">
                    {AIR_STATE_LABELS[state]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Stats Overview */}
        {stations.length > 0 && (
          <div className="absolute top-6 left-6 glass rounded-xl p-4 z-[1000]">
            <h4 className="text-sm font-semibold mb-2">Обзор станций</h4>
            <div className="flex gap-4">
              <div>
                <span className="text-2xl font-bold gradient-text">{stations.length}</span>
                <p className="text-xs text-[var(--color-text-muted)]">Активных</p>
              </div>
              <div>
                <span className="text-2xl font-bold" style={{ color: getEcoIndexColor(Math.round(stations.reduce((sum, s) => sum + s.analysis.eco_index, 0) / stations.length)) }}>
                  {Math.round(stations.reduce((sum, s) => sum + s.analysis.eco_index, 0) / stations.length)}
                </span>
                <p className="text-xs text-[var(--color-text-muted)]">Ср. индекс</p>
              </div>
            </div>
          </div>
        )}

        {/* Last Update Time */}
        {mounted && (
          <div className="absolute top-6 right-6 glass rounded-xl px-4 py-2 z-[1000] flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[var(--color-accent-green)] animate-pulse" />
            <span className="text-xs text-[var(--color-text-muted)]">
              Обновлено: {lastRefresh?.toLocaleTimeString('ru-RU') || '--:--:--'}
            </span>
          </div>
        )}

        {/* Offline/No Data Warning */}
        {(offlineStations.length > 0 || noDataStations.length > 0) && stations.length > 0 && (
          <div className="absolute bottom-6 right-6 glass rounded-xl p-3 z-[1000] max-w-xs">
            {offlineStations.length > 0 && (
              <div className="flex items-center gap-2 text-yellow-400 text-sm">
                <span>⚠️</span>
                <span>Offline: {offlineStations.map(s => s.station_id.split('-').pop()).join(', ')}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Side Panel */}
      {selectedStation && (
        <div className="w-96 bg-[var(--color-bg-secondary)] border-l border-[var(--border-color)] overflow-y-auto animate-fade-in">
          <StationDetails station={selectedStation} onClose={() => setSelectedStation(null)} />
        </div>
      )}
    </div>
  );
}

function StationDetails({ station, onClose }: { station: Station; onClose: () => void }) {
  const { analysis, env, gases, dust, location } = station;
  
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold">{station.station_id}</h2>
          <p className="text-sm text-[var(--color-text-muted)]">
            {location.geo_cluster_label?.replace('_', ' ') || 'Unknown'}
          </p>
        </div>
        <button 
          onClick={onClose}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--color-bg-card)] transition-colors"
        >
          ✕
        </button>
      </div>

      {/* Last Update */}
      <div className="mb-4 text-sm text-[var(--color-text-muted)] flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-[var(--color-accent-green)]" />
        Данные от: {new Date(station.timestamp).toLocaleString('ru-RU')}
      </div>

      {/* Eco Index */}
      <div className="card p-4 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-[var(--color-text-muted)]">Экологический индекс</p>
            <p className="text-4xl font-bold" style={{ color: getEcoIndexColor(analysis.eco_index) }}>
              {analysis.eco_index}
            </p>
          </div>
          <div 
            className="px-3 py-1.5 rounded-lg text-sm font-medium"
            style={{ 
              backgroundColor: `${getEcoIndexColor(analysis.eco_index)}20`,
              color: getEcoIndexColor(analysis.eco_index)
            }}
          >
            {AIR_STATE_LABELS[analysis.air_state]}
          </div>
        </div>
      </div>

      {/* Pollution & Microclimate */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="card p-3">
          <p className="text-xs text-[var(--color-text-muted)] mb-1">Тип загрязнения</p>
          <p className="font-semibold">{POLLUTION_TYPE_LABELS[analysis.pollution_type]}</p>
        </div>
        <div className="card p-3">
          <p className="text-xs text-[var(--color-text-muted)] mb-1">Микроклимат</p>
          <p className="font-semibold">{MICROCLIMATE_LABELS[analysis.microclimate]}</p>
        </div>
      </div>

      {/* Sensor Readings */}
      <div className="card p-4 mb-4">
        <h3 className="text-sm font-semibold mb-3">Показания датчиков</h3>
        <div className="grid grid-cols-2 gap-4">
          <SensorValue label="CO₂" value={`${gases.co2_ppm} ppm`} icon="💨" />
          <SensorValue label="Пыль" value={`${dust.dust_mg_m3.toFixed(3)} мг/м³`} icon="🌫️" />
          <SensorValue label="Температура" value={`${env.temperature_c}°C`} icon="🌡️" />
          <SensorValue label="Влажность" value={`${env.humidity_pct}%`} icon="💧" />
          <SensorValue label="Давление" value={`${env.pressure_hpa} гПа`} icon="📊" />
          <SensorValue label="MQ-135 (VOC)" value={gases.mq135_raw.toString()} icon="⚗️" />
        </div>
      </div>

      {/* Alerts */}
      {analysis.alerts.length > 0 && (
        <div className="card p-4 border-[var(--color-accent-red)]/30">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <span className="text-[var(--color-accent-red)]">⚠️</span>
            Предупреждения
          </h3>
          <div className="flex flex-wrap gap-2">
            {analysis.alerts.map((alert, i) => (
              <span 
                key={i}
                className="px-2 py-1 bg-[var(--color-accent-red)]/10 text-[var(--color-accent-red)] rounded-lg text-sm"
              >
                {alert.replace(/_/g, ' ')}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* GPS Info */}
      <div className="mt-4 text-xs text-[var(--color-text-muted)]">
        <p>📍 {location.lat.toFixed(4)}, {location.lon.toFixed(4)}</p>
        <p>🛰️ Спутников: {location.satellites} | GPS: {location.gps_fix ? '✓' : '✗'}</p>
      </div>
    </div>
  );
}

function SensorValue({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-lg">{icon}</span>
      <div>
        <p className="text-xs text-[var(--color-text-muted)]">{label}</p>
        <p className="font-medium">{value}</p>
      </div>
    </div>
  );
}
