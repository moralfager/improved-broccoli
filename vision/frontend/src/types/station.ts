/**
 * TypeScript interfaces for Eco Monitoring data
 */

export interface Location {
  lat: number;
  lon: number;
  alt: number;
  satellites: number;
  gps_fix: boolean;
  geo_cluster: number | null;
  geo_cluster_label: string | null;
}

export interface Environment {
  temperature_c: number;
  humidity_pct: number;
  pressure_hpa: number;
}

export interface Gases {
  co2_ppm: number;
  mq135_raw: number;
  mq5_raw: number;
}

export interface Dust {
  gp2y1010_raw: number;
  dust_mg_m3: number;
}

export interface AirStateProba {
  clean: number;
  moderate: number;
  polluted: number;
  danger: number;
}

export interface PollutionTypeProba {
  clean_air: number;
  dust: number;
  smoke: number;
  voc_chemicals: number;
  gas_leak: number;
  stuffy: number;
}

export interface Analysis {
  eco_index: number;
  air_state: 'clean' | 'moderate' | 'polluted' | 'danger';
  air_state_proba: AirStateProba;
  pollution_type: 'clean_air' | 'dust' | 'smoke' | 'voc_chemicals' | 'gas_leak' | 'stuffy';
  pollution_type_proba: PollutionTypeProba;
  microclimate: 'comfortable' | 'uncomfortable' | 'stuffy' | 'too_dry' | 'too_humid';
  microclimate_flags: string[];
  anomaly: boolean;
  alerts: string[];
}

export interface Station {
  station_id: string;
  timestamp: string;
  location: Location;
  env: Environment;
  gases: Gases;
  dust: Dust;
  analysis: Analysis;
}

export interface LatestResponse {
  stations: Station[];
}

export interface HourlyData {
  hour: number;
  eco_index_avg: number | null;
  co2_ppm_avg: number | null;
  dust_mg_m3_avg: number | null;
  temperature_c_avg: number | null;
  humidity_pct_avg: number | null;
  has_data: boolean;
}

export interface DailyProfileResponse {
  station_id: string;
  city: string;
  date: string;
  timezone: string;
  current_hour: number;
  total_readings: number;
  hours_with_data: number;
  daily_profile: HourlyData[];
}

export interface StationInfo {
  station_id: string;
  city: string;
  lat: number;
  lon: number;
  geo_cluster_label: string;
}

export interface StationsListResponse {
  stations: StationInfo[];
}

// Helper types
export type AirState = Analysis['air_state'];
export type PollutionType = Analysis['pollution_type'];
export type Microclimate = Analysis['microclimate'];

// Color mappings for visualization
export const AIR_STATE_COLORS: Record<AirState, string> = {
  clean: '#22c55e',      // green-500
  moderate: '#eab308',   // yellow-500
  polluted: '#f97316',   // orange-500
  danger: '#ef4444',     // red-500
};

export const AIR_STATE_LABELS: Record<AirState, string> = {
  clean: 'Чистый',
  moderate: 'Умеренный',
  polluted: 'Загрязнённый',
  danger: 'Опасный',
};

export const POLLUTION_TYPE_LABELS: Record<PollutionType, string> = {
  clean_air: 'Чистый воздух',
  dust: 'Пыль',
  smoke: 'Дым',
  voc_chemicals: 'Химикаты/VOC',
  gas_leak: 'Утечка газа',
  stuffy: 'Духота',
};

export const MICROCLIMATE_LABELS: Record<Microclimate, string> = {
  comfortable: 'Комфортный',
  uncomfortable: 'Некомфортный',
  stuffy: 'Душно',
  too_dry: 'Слишком сухо',
  too_humid: 'Слишком влажно',
};

/**
 * Get eco index color based on value (0-100)
 */
export function getEcoIndexColor(ecoIndex: number): string {
  if (ecoIndex <= 25) return '#22c55e';  // green
  if (ecoIndex <= 50) return '#eab308';  // yellow
  if (ecoIndex <= 75) return '#f97316';  // orange
  return '#ef4444';                       // red
}

/**
 * Get eco index gradient for heatmap
 */
export function getEcoIndexGradient(ecoIndex: number): string {
  const normalized = Math.max(0, Math.min(100, ecoIndex)) / 100;
  
  if (normalized <= 0.25) {
    // Green to Yellow
    const t = normalized / 0.25;
    return interpolateColor('#22c55e', '#eab308', t);
  } else if (normalized <= 0.5) {
    // Yellow to Orange
    const t = (normalized - 0.25) / 0.25;
    return interpolateColor('#eab308', '#f97316', t);
  } else if (normalized <= 0.75) {
    // Orange to Red
    const t = (normalized - 0.5) / 0.25;
    return interpolateColor('#f97316', '#ef4444', t);
  } else {
    // Dark red
    const t = (normalized - 0.75) / 0.25;
    return interpolateColor('#ef4444', '#991b1b', t);
  }
}

function interpolateColor(color1: string, color2: string, t: number): string {
  const r1 = parseInt(color1.slice(1, 3), 16);
  const g1 = parseInt(color1.slice(3, 5), 16);
  const b1 = parseInt(color1.slice(5, 7), 16);
  
  const r2 = parseInt(color2.slice(1, 3), 16);
  const g2 = parseInt(color2.slice(3, 5), 16);
  const b2 = parseInt(color2.slice(5, 7), 16);
  
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);
  
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

