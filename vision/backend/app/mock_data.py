"""
Mock data generator for Eco Monitoring API
Generates realistic pseudo-data mimicking real sensor readings
"""
import random
from datetime import datetime, timedelta
from typing import Optional
from zoneinfo import ZoneInfo

from app.models import RawSensorData


# Station configurations
STATIONS_CONFIG = [
    {
        "station_id": "eco-astana-01",
        "city": "Astana",
        "lat": 51.1694,
        "lon": 71.4491,
        "alt": 350.0,
        "timezone": "Asia/Almaty",
        "geo_cluster": 1,
        "geo_cluster_label": "urban_center"
    },
    {
        "station_id": "eco-astana-02",
        "city": "Astana",
        "lat": 51.1280,
        "lon": 71.4307,
        "alt": 345.0,
        "timezone": "Asia/Almaty",
        "geo_cluster": 2,
        "geo_cluster_label": "industrial_zone"
    },
    {
        "station_id": "eco-astana-03",
        "city": "Astana",
        "lat": 51.1801,
        "lon": 71.4460,
        "alt": 352.0,
        "timezone": "Asia/Almaty",
        "geo_cluster": 3,
        "geo_cluster_label": "residential_area"
    },
    {
        "station_id": "eco-almaty-01",
        "city": "Almaty",
        "lat": 43.2380,
        "lon": 76.9450,
        "alt": 750.0,
        "timezone": "Asia/Almaty",
        "geo_cluster": 4,
        "geo_cluster_label": "urban_hotspot"
    },
    {
        "station_id": "eco-almaty-02",
        "city": "Almaty",
        "lat": 43.2567,
        "lon": 76.9286,
        "alt": 780.0,
        "timezone": "Asia/Almaty",
        "geo_cluster": 5,
        "geo_cluster_label": "mountain_foothill"
    }
]


def _generate_base_values(hour: int, geo_cluster_label: str) -> dict:
    """Generate base sensor values based on time of day and location type"""
    
    # Time-based patterns
    is_rush_hour = hour in [7, 8, 9, 17, 18, 19]
    is_night = hour < 6 or hour > 22
    is_midday = 11 <= hour <= 14
    
    # Base CO2 levels (ppm)
    base_co2 = 450
    if is_rush_hour:
        base_co2 += random.randint(200, 400)
    elif is_midday:
        base_co2 += random.randint(100, 200)
    elif is_night:
        base_co2 += random.randint(-50, 50)
    
    # Location-based adjustments
    if geo_cluster_label == "industrial_zone":
        base_co2 += random.randint(150, 300)
    elif geo_cluster_label == "urban_hotspot":
        base_co2 += random.randint(100, 250)
    elif geo_cluster_label == "residential_area":
        base_co2 += random.randint(-50, 100)
    elif geo_cluster_label == "mountain_foothill":
        base_co2 += random.randint(-100, 50)
    
    # Dust levels (mg/m³)
    base_dust = 0.015
    if is_rush_hour:
        base_dust += random.uniform(0.01, 0.03)
    if geo_cluster_label == "industrial_zone":
        base_dust += random.uniform(0.02, 0.05)
    elif geo_cluster_label == "urban_hotspot":
        base_dust += random.uniform(0.01, 0.03)
    
    # MQ sensors (raw ADC 0-4095)
    base_mq135 = random.randint(1500, 2500)
    base_mq5 = random.randint(500, 1000)
    
    if geo_cluster_label == "industrial_zone":
        base_mq135 += random.randint(500, 1000)
        base_mq5 += random.randint(200, 500)
    
    # Temperature based on time (winter scenario: -10 to 0)
    base_temp = -5.0
    if is_night:
        base_temp -= random.uniform(3, 6)
    elif is_midday:
        base_temp += random.uniform(2, 5)
    
    # Humidity
    base_humidity = 70.0
    if is_midday:
        base_humidity -= random.uniform(5, 15)
    elif is_night:
        base_humidity += random.uniform(5, 10)
    
    return {
        "co2_ppm": max(400, min(2000, base_co2 + random.randint(-50, 50))),
        "dust_mg_m3": max(0.005, min(0.3, base_dust + random.uniform(-0.005, 0.005))),
        "mq135_raw": max(0, min(4095, base_mq135 + random.randint(-200, 200))),
        "mq5_raw": max(0, min(4095, base_mq5 + random.randint(-100, 100))),
        "temperature_c": round(base_temp + random.uniform(-1, 1), 1),
        "humidity_pct": round(max(30, min(95, base_humidity + random.uniform(-5, 5))), 1),
        "pressure_hpa": round(1013.0 + random.uniform(-10, 10), 1)
    }


def generate_raw_data(station_id: Optional[str] = None, 
                      timestamp: Optional[datetime] = None) -> list[RawSensorData]:
    """Generate raw sensor data for all stations or a specific station"""
    
    if timestamp is None:
        timestamp = datetime.now(ZoneInfo("Asia/Almaty"))
    
    stations = STATIONS_CONFIG
    if station_id:
        stations = [s for s in stations if s["station_id"] == station_id]
    
    result = []
    for station in stations:
        hour = timestamp.hour
        values = _generate_base_values(hour, station["geo_cluster_label"])
        
        # Calculate GP2Y1010 raw from dust concentration
        gp2y1010_raw = int(values["dust_mg_m3"] * 10000 + random.randint(-100, 100))
        gp2y1010_raw = max(0, min(4095, gp2y1010_raw))
        
        raw_data = RawSensorData(
            station_id=station["station_id"],
            timestamp=timestamp,
            lat=station["lat"],
            lon=station["lon"],
            alt=station["alt"],
            satellites=random.randint(6, 12),
            gps_fix=True,
            temperature_c=values["temperature_c"],
            humidity_pct=values["humidity_pct"],
            pressure_hpa=values["pressure_hpa"],
            co2_ppm=values["co2_ppm"],
            mq135_raw=values["mq135_raw"],
            mq5_raw=values["mq5_raw"],
            gp2y1010_raw=gp2y1010_raw,
            dust_mg_m3=values["dust_mg_m3"]
        )
        result.append(raw_data)
    
    return result


def generate_daily_profile_data(station_id: str, date: Optional[str] = None) -> list[dict]:
    """Generate hourly aggregated data for a full day"""
    
    station = next((s for s in STATIONS_CONFIG if s["station_id"] == station_id), None)
    if not station:
        station = STATIONS_CONFIG[0]  # Default to first station
    
    if date is None:
        date = datetime.now(ZoneInfo("Asia/Almaty")).strftime("%Y-%m-%d")
    
    profile = []
    for hour in range(24):
        values = _generate_base_values(hour, station["geo_cluster_label"])
        
        # Calculate eco_index for this hour (simplified)
        co2_norm = max(0, min(1, (values["co2_ppm"] - 400) / (1500 - 400)))
        dust_norm = max(0, min(1, values["dust_mg_m3"] / 0.25))
        mq135_norm = max(0, min(1, values["mq135_raw"] / 4095))
        mq5_norm = max(0, min(1, values["mq5_raw"] / 4095))
        
        eco_index = (0.4 * co2_norm + 0.3 * dust_norm + 0.2 * mq135_norm + 0.1 * mq5_norm) * 100
        
        # Temperature/humidity correction
        if values["temperature_c"] < 16 or values["temperature_c"] > 28:
            eco_index += 10
        if values["humidity_pct"] < 30 or values["humidity_pct"] > 70:
            eco_index += 5
        
        eco_index = max(0, min(100, eco_index))
        
        profile.append({
            "hour": hour,
            "eco_index_avg": round(eco_index, 1),
            "co2_ppm_avg": round(values["co2_ppm"], 1),
            "dust_mg_m3_avg": round(values["dust_mg_m3"], 4),
            "temperature_c_avg": round(values["temperature_c"], 1),
            "humidity_pct_avg": round(values["humidity_pct"], 1)
        })
    
    return profile


def get_station_config(station_id: str) -> Optional[dict]:
    """Get station configuration by ID"""
    return next((s for s in STATIONS_CONFIG if s["station_id"] == station_id), None)


def get_all_station_ids() -> list[str]:
    """Get list of all station IDs"""
    return [s["station_id"] for s in STATIONS_CONFIG]

