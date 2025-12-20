'use client';

import dynamic from 'next/dynamic';
import { Station } from '@/types/station';

// Dynamic import to avoid SSR issues with Leaflet
const StationMap = dynamic(() => import('./StationMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-[var(--color-bg-secondary)] rounded-xl">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-[var(--color-accent-blue)] border-t-transparent rounded-full animate-spin" />
        <span className="text-[var(--color-text-muted)]">Загрузка карты...</span>
      </div>
    </div>
  ),
});

interface MapWrapperProps {
  stations: Station[];
  onStationClick?: (station: Station) => void;
}

export default function MapWrapper({ stations, onStationClick }: MapWrapperProps) {
  return <StationMap stations={stations} onStationClick={onStationClick} />;
}

