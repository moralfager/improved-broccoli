"""
DataStore - In-memory storage for station data
Stores the latest readings and hourly history for each station
"""
from datetime import datetime, timedelta
from typing import Optional
from zoneinfo import ZoneInfo
from pydantic import BaseModel
from collections import defaultdict


# Timezone for Astana
TZ = ZoneInfo("Asia/Almaty")

# Station is considered offline if no data for this duration
OFFLINE_THRESHOLD_HOURS = 3


class StationReading(BaseModel):
    """Raw reading received from a station"""
    station_id: str
    lat: float
    lon: float
    alt: float = 350.0
    temperature_c: float
    humidity_pct: float
    pressure_hpa: float
    co2_ppm: int
    mq135_raw: int
    mq5_raw: int
    gp2y1010_raw: int
    dust_mg_m3: Optional[float] = None  # Pre-calculated dust concentration


class StoredData(BaseModel):
    """Data stored for a station"""
    reading: StationReading
    timestamp: datetime
    dust_mg_m3: float  # Computed from gp2y1010_raw


class StationStatus(BaseModel):
    """Station status info"""
    station_id: str
    status: str  # "online", "offline", "no_data"
    last_update: Optional[datetime] = None
    seconds_since_update: Optional[int] = None


class HourlyAggregate(BaseModel):
    """Aggregated data for one hour"""
    hour: int
    count: int  # Number of readings in this hour
    eco_index_sum: float
    co2_ppm_sum: float
    dust_mg_m3_sum: float
    temperature_c_sum: float
    humidity_pct_sum: float
    
    @property
    def eco_index_avg(self) -> Optional[float]:
        return round(self.eco_index_sum / self.count, 1) if self.count > 0 else None
    
    @property
    def co2_ppm_avg(self) -> Optional[float]:
        return round(self.co2_ppm_sum / self.count, 1) if self.count > 0 else None
    
    @property
    def dust_mg_m3_avg(self) -> Optional[float]:
        return round(self.dust_mg_m3_sum / self.count, 4) if self.count > 0 else None
    
    @property
    def temperature_c_avg(self) -> Optional[float]:
        return round(self.temperature_c_sum / self.count, 1) if self.count > 0 else None
    
    @property
    def humidity_pct_avg(self) -> Optional[float]:
        return round(self.humidity_pct_sum / self.count, 1) if self.count > 0 else None


class DailyHistory:
    """Stores hourly aggregated data for a single day"""
    
    def __init__(self, date: str):
        self.date = date  # Format: YYYY-MM-DD
        self.hours: dict[int, HourlyAggregate] = {}
    
    def add_reading(self, hour: int, eco_index: float, co2_ppm: int, 
                    dust_mg_m3: float, temperature_c: float, humidity_pct: float):
        """Add a reading to the hourly aggregate"""
        if hour not in self.hours:
            self.hours[hour] = HourlyAggregate(
                hour=hour,
                count=0,
                eco_index_sum=0,
                co2_ppm_sum=0,
                dust_mg_m3_sum=0,
                temperature_c_sum=0,
                humidity_pct_sum=0
            )
        
        agg = self.hours[hour]
        self.hours[hour] = HourlyAggregate(
            hour=hour,
            count=agg.count + 1,
            eco_index_sum=agg.eco_index_sum + eco_index,
            co2_ppm_sum=agg.co2_ppm_sum + co2_ppm,
            dust_mg_m3_sum=agg.dust_mg_m3_sum + dust_mg_m3,
            temperature_c_sum=agg.temperature_c_sum + temperature_c,
            humidity_pct_sum=agg.humidity_pct_sum + humidity_pct
        )
    
    def get_profile(self, current_hour: int) -> list[dict]:
        """Get daily profile with nulls for hours without data"""
        profile = []
        for hour in range(24):
            if hour in self.hours:
                agg = self.hours[hour]
                profile.append({
                    "hour": hour,
                    "eco_index_avg": agg.eco_index_avg,
                    "co2_ppm_avg": agg.co2_ppm_avg,
                    "dust_mg_m3_avg": agg.dust_mg_m3_avg,
                    "temperature_c_avg": agg.temperature_c_avg,
                    "humidity_pct_avg": agg.humidity_pct_avg,
                    "has_data": True
                })
            elif hour <= current_hour:
                # Past hour with no data
                profile.append({
                    "hour": hour,
                    "eco_index_avg": None,
                    "co2_ppm_avg": None,
                    "dust_mg_m3_avg": None,
                    "temperature_c_avg": None,
                    "humidity_pct_avg": None,
                    "has_data": False
                })
            else:
                # Future hour
                profile.append({
                    "hour": hour,
                    "eco_index_avg": None,
                    "co2_ppm_avg": None,
                    "dust_mg_m3_avg": None,
                    "temperature_c_avg": None,
                    "humidity_pct_avg": None,
                    "has_data": False
                })
        return profile


class DataStore:
    """
    In-memory data store for station readings.
    Stores the most recent reading and hourly history for each station.
    """
    
    def __init__(self):
        self._data: dict[str, StoredData] = {}
        self._history: dict[str, dict[str, DailyHistory]] = defaultdict(dict)  # station_id -> date -> DailyHistory
        self._station_configs: dict[str, dict] = {
            "eco-astana-01": {
                "city": "Astana",
                "geo_cluster": 1,
                "geo_cluster_label": "urban_center",
                "timezone": "Asia/Almaty"
            },
            "eco-astana-02": {
                "city": "Astana",
                "geo_cluster": 2,
                "geo_cluster_label": "industrial_zone",
                "timezone": "Asia/Almaty"
            }
        }
    
    def _compute_dust_mg_m3(self, gp2y1010_raw: int) -> float:
        """
        Convert GP2Y1010AU0F raw ADC value to dust concentration in mg/m³
        Using approximate calibration formula
        """
        voltage = (gp2y1010_raw / 4095) * 3.3
        dust_density = max(0, (voltage - 0.6) * 0.17)
        return round(dust_density, 4)
    
    def _compute_eco_index(self, co2_ppm: int, dust_mg_m3: float, 
                           mq135_raw: int, mq5_raw: int,
                           temperature_c: float, humidity_pct: float) -> int:
        """Compute eco index from sensor values"""
        def clamp(v, min_v, max_v):
            return max(min_v, min(max_v, v))
        
        co2_norm = clamp((co2_ppm - 400) / (1500 - 400), 0, 1)
        dust_norm = clamp(dust_mg_m3 / 0.25, 0, 1)
        mq135_norm = clamp(mq135_raw / 4095, 0, 1)
        mq5_norm = clamp(mq5_raw / 4095, 0, 1)
        
        eco_index = (0.4 * co2_norm + 0.3 * dust_norm + 0.2 * mq135_norm + 0.1 * mq5_norm) * 100
        
        if temperature_c < 16 or temperature_c > 28:
            eco_index += 10
        if humidity_pct < 30 or humidity_pct > 70:
            eco_index += 5
        
        return int(clamp(eco_index, 0, 100))
    
    def store_reading(self, reading: StationReading) -> StoredData:
        """
        Store a new reading from a station.
        Updates both latest data and hourly history.
        """
        now = datetime.now(TZ)
        today = now.strftime("%Y-%m-%d")
        current_hour = now.hour
        
        # Use pre-calculated dust value if provided, otherwise compute from raw
        if reading.dust_mg_m3 is not None:
            dust_mg_m3 = reading.dust_mg_m3
        else:
            dust_mg_m3 = self._compute_dust_mg_m3(reading.gp2y1010_raw)
        
        # Compute eco_index for history
        eco_index = self._compute_eco_index(
            reading.co2_ppm, dust_mg_m3,
            reading.mq135_raw, reading.mq5_raw,
            reading.temperature_c, reading.humidity_pct
        )
        
        stored = StoredData(
            reading=reading,
            timestamp=now,
            dust_mg_m3=dust_mg_m3
        )
        
        # Store latest reading
        self._data[reading.station_id] = stored
        
        # Add to hourly history
        if today not in self._history[reading.station_id]:
            self._history[reading.station_id][today] = DailyHistory(today)
        
        self._history[reading.station_id][today].add_reading(
            hour=current_hour,
            eco_index=eco_index,
            co2_ppm=reading.co2_ppm,
            dust_mg_m3=dust_mg_m3,
            temperature_c=reading.temperature_c,
            humidity_pct=reading.humidity_pct
        )
        
        return stored
    
    def get_reading(self, station_id: str) -> Optional[StoredData]:
        """Get the latest reading for a station"""
        return self._data.get(station_id)
    
    def get_all_readings(self) -> dict[str, StoredData]:
        """Get all stored readings"""
        return self._data.copy()
    
    def get_daily_history(self, station_id: str, date: Optional[str] = None) -> Optional[DailyHistory]:
        """Get daily history for a station"""
        if date is None:
            date = datetime.now(TZ).strftime("%Y-%m-%d")
        
        return self._history.get(station_id, {}).get(date)
    
    def get_daily_profile(self, station_id: str, date: Optional[str] = None) -> list[dict]:
        """Get daily profile with hourly averages"""
        now = datetime.now(TZ)
        if date is None:
            date = now.strftime("%Y-%m-%d")
        
        current_hour = now.hour if date == now.strftime("%Y-%m-%d") else 23
        
        history = self.get_daily_history(station_id, date)
        if history:
            return history.get_profile(current_hour)
        else:
            # No data for this day - return all nulls
            return [
                {
                    "hour": hour,
                    "eco_index_avg": None,
                    "co2_ppm_avg": None,
                    "dust_mg_m3_avg": None,
                    "temperature_c_avg": None,
                    "humidity_pct_avg": None,
                    "has_data": False
                }
                for hour in range(24)
            ]
    
    def get_station_status(self, station_id: str) -> StationStatus:
        """Get status of a station"""
        stored = self._data.get(station_id)
        now = datetime.now(TZ)
        
        if stored is None:
            return StationStatus(
                station_id=station_id,
                status="no_data"
            )
        
        time_diff = now - stored.timestamp
        seconds_since = int(time_diff.total_seconds())
        
        if time_diff > timedelta(hours=OFFLINE_THRESHOLD_HOURS):
            status = "offline"
        else:
            status = "online"
        
        return StationStatus(
            station_id=station_id,
            status=status,
            last_update=stored.timestamp,
            seconds_since_update=seconds_since
        )
    
    def get_all_statuses(self) -> list[StationStatus]:
        """Get status of all known stations"""
        statuses = []
        for station_id in self._station_configs.keys():
            statuses.append(self.get_station_status(station_id))
        return statuses
    
    def get_station_config(self, station_id: str) -> Optional[dict]:
        """Get configuration for a station"""
        return self._station_configs.get(station_id)
    
    def get_known_station_ids(self) -> list[str]:
        """Get list of all known station IDs"""
        return list(self._station_configs.keys())
    
    def get_history_stats(self, station_id: str) -> dict:
        """Get statistics about stored history"""
        station_history = self._history.get(station_id, {})
        stats = {
            "station_id": station_id,
            "days_with_data": len(station_history),
            "dates": list(station_history.keys())
        }
        
        for date, daily in station_history.items():
            stats[date] = {
                "hours_with_data": len(daily.hours),
                "hours": list(daily.hours.keys()),
                "total_readings": sum(h.count for h in daily.hours.values())
            }
        
        return stats
    
    def clear(self):
        """Clear all stored data (for testing)"""
        self._data.clear()
        self._history.clear()


# Global datastore instance
_datastore: Optional[DataStore] = None


def get_datastore() -> DataStore:
    """Get the global datastore instance"""
    global _datastore
    if _datastore is None:
        _datastore = DataStore()
    return _datastore
