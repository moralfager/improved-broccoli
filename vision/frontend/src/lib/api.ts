/**
 * API Client for Eco Monitoring Backend
 */

import { LatestResponse, DailyProfileResponse, StationsListResponse } from '@/types/station';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

/**
 * Fetch latest data for all stations or a specific station
 */
export async function fetchLatest(stationId?: string): Promise<LatestResponse> {
  const url = new URL(`${API_BASE_URL}/api/latest`);
  if (stationId) {
    url.searchParams.set('station_id', stationId);
  }
  
  const response = await fetch(url.toString(), {
    next: { revalidate: 30 }, // Cache for 30 seconds
  });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch latest data: ${response.statusText}`);
  }
  
  return response.json();
}

/**
 * Fetch daily profile for a specific station
 */
export async function fetchDailyProfile(stationId: string, date?: string): Promise<DailyProfileResponse> {
  const url = new URL(`${API_BASE_URL}/api/daily_profile`);
  url.searchParams.set('station_id', stationId);
  if (date) {
    url.searchParams.set('date', date);
  }
  
  const response = await fetch(url.toString(), {
    next: { revalidate: 60 }, // Cache for 60 seconds
  });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch daily profile: ${response.statusText}`);
  }
  
  return response.json();
}

/**
 * Fetch list of all stations
 */
export async function fetchStations(): Promise<StationsListResponse> {
  const response = await fetch(`${API_BASE_URL}/api/stations`, {
    next: { revalidate: 300 }, // Cache for 5 minutes
  });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch stations: ${response.statusText}`);
  }
  
  return response.json();
}

/**
 * Client-side fetcher for SWR/React Query (no caching headers)
 */
export const fetcher = async <T>(url: string): Promise<T> => {
  const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
  const response = await fetch(fullUrl);
  
  if (!response.ok) {
    throw new Error(`API Error: ${response.statusText}`);
  }
  
  return response.json();
};

// Station status type
export interface StationStatusInfo {
  station_id: string;
  status: 'online' | 'offline' | 'no_data';
  last_update: string | null;
  seconds_since_update: number | null;
}

/**
 * Hook-friendly API functions for client components
 */
export const clientApi = {
  getLatest: async (stationId?: string): Promise<LatestResponse> => {
    const url = stationId 
      ? `${API_BASE_URL}/api/latest?station_id=${stationId}`
      : `${API_BASE_URL}/api/latest`;
    return fetcher<LatestResponse>(url);
  },
  
  getDailyProfile: async (stationId: string, date?: string): Promise<DailyProfileResponse> => {
    let url = `${API_BASE_URL}/api/daily_profile?station_id=${stationId}`;
    if (date) url += `&date=${date}`;
    return fetcher<DailyProfileResponse>(url);
  },
  
  getStations: async (): Promise<StationsListResponse> => {
    return fetcher<StationsListResponse>(`${API_BASE_URL}/api/stations`);
  },
  
  getStatus: async (): Promise<StationStatusInfo[]> => {
    return fetcher<StationStatusInfo[]>(`${API_BASE_URL}/api/status`);
  },
};

