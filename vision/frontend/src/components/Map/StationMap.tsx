'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Station, getEcoIndexColor, AIR_STATE_LABELS, POLLUTION_TYPE_LABELS } from '@/types/station';

// Fix for default marker icons in Leaflet with Next.js
const createCustomIcon = (ecoIndex: number) => {
  const color = getEcoIndexColor(ecoIndex);
  
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        width: 36px;
        height: 36px;
        border-radius: 50%;
        background: ${color};
        border: 3px solid white;
        box-shadow: 0 2px 10px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        font-size: 11px;
        color: white;
        text-shadow: 0 1px 2px rgba(0,0,0,0.5);
      ">
        ${ecoIndex}
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -18],
  });
};

interface StationMapProps {
  stations: Station[];
  onStationClick?: (station: Station) => void;
}

function MapController({ center }: { center: [number, number] }) {
  const map = useMap();
  
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  
  return null;
}

export default function StationMap({ stations, onStationClick }: StationMapProps) {
  const [mounted, setMounted] = useState(false);
  
  // Calculate center from stations
  const center: [number, number] = stations.length > 0
    ? [
        stations.reduce((sum, s) => sum + s.location.lat, 0) / stations.length,
        stations.reduce((sum, s) => sum + s.location.lon, 0) / stations.length,
      ]
    : [51.1694, 71.4491]; // Default to Astana
  
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-[var(--color-bg-secondary)]">
        <div className="text-[var(--color-text-muted)]">Загрузка карты...</div>
      </div>
    );
  }

  return (
    <MapContainer
      center={center}
      zoom={10}
      style={{ height: '100%', width: '100%' }}
      className="rounded-xl"
    >
      <TileLayer
        attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      />
      <MapController center={center} />
      
      {stations.map((station) => (
        <Marker
          key={station.station_id}
          position={[station.location.lat, station.location.lon]}
          icon={createCustomIcon(station.analysis.eco_index)}
          eventHandlers={{
            click: () => onStationClick?.(station),
          }}
        >
          <Popup>
            <StationPopup station={station} />
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}

function StationPopup({ station }: { station: Station }) {
  const { analysis, env, gases, dust } = station;
  
  return (
    <div className="min-w-[250px] p-2">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-base">{station.station_id}</h3>
        <span 
          className="px-2 py-1 rounded-full text-xs font-medium text-white"
          style={{ backgroundColor: getEcoIndexColor(analysis.eco_index) }}
        >
          {AIR_STATE_LABELS[analysis.air_state]}
        </span>
      </div>
      
      <div className="grid grid-cols-2 gap-2 text-sm mb-3">
        <div className="flex flex-col">
          <span className="text-[var(--color-text-muted)] text-xs">Eco Index</span>
          <span className="font-bold text-lg" style={{ color: getEcoIndexColor(analysis.eco_index) }}>
            {analysis.eco_index}
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-[var(--color-text-muted)] text-xs">Загрязнение</span>
          <span className="font-medium">{POLLUTION_TYPE_LABELS[analysis.pollution_type]}</span>
        </div>
      </div>
      
      <div className="grid grid-cols-3 gap-2 text-xs border-t border-[var(--border-color)] pt-2">
        <div>
          <span className="text-[var(--color-text-muted)]">CO₂</span>
          <p className="font-medium">{gases.co2_ppm} ppm</p>
        </div>
        <div>
          <span className="text-[var(--color-text-muted)]">Пыль</span>
          <p className="font-medium">{dust.dust_mg_m3.toFixed(3)} мг/м³</p>
        </div>
        <div>
          <span className="text-[var(--color-text-muted)]">Темп.</span>
          <p className="font-medium">{env.temperature_c}°C</p>
        </div>
      </div>
      
      {analysis.alerts.length > 0 && (
        <div className="mt-2 pt-2 border-t border-[var(--border-color)]">
          <div className="flex flex-wrap gap-1">
            {analysis.alerts.map((alert, i) => (
              <span 
                key={i}
                className="px-2 py-0.5 bg-red-500/20 text-red-400 rounded text-xs"
              >
                {alert}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

