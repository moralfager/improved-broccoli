"""
Pydantic models for Eco Monitoring API
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class Location(BaseModel):
    """GPS location data"""
    lat: float = Field(..., description="Latitude")
    lon: float = Field(..., description="Longitude")
    alt: float = Field(default=0.0, description="Altitude in meters")
    satellites: int = Field(default=0, description="Number of GPS satellites")
    gps_fix: bool = Field(default=True, description="GPS fix status")
    geo_cluster: Optional[int] = Field(default=None, description="Geo cluster ID")
    geo_cluster_label: Optional[str] = Field(default=None, description="Geo cluster label")


class Environment(BaseModel):
    """Environmental sensors data"""
    temperature_c: float = Field(..., description="Temperature in Celsius")
    humidity_pct: float = Field(..., description="Humidity percentage")
    pressure_hpa: float = Field(..., description="Atmospheric pressure in hPa")


class Gases(BaseModel):
    """Gas sensors data"""
    co2_ppm: int = Field(..., description="CO2 concentration in ppm")
    mq135_raw: int = Field(..., description="MQ-135 raw ADC value (VOC)")
    mq5_raw: int = Field(..., description="MQ-5 raw ADC value (combustible gases)")


class Dust(BaseModel):
    """Dust sensor data"""
    gp2y1010_raw: int = Field(..., description="GP2Y1010AU0F raw ADC value")
    dust_mg_m3: float = Field(..., description="Dust concentration in mg/m³")


class AirStateProba(BaseModel):
    """Air state classification probabilities"""
    clean: float = Field(..., ge=0, le=1)
    moderate: float = Field(..., ge=0, le=1)
    polluted: float = Field(..., ge=0, le=1)
    danger: float = Field(..., ge=0, le=1)


class PollutionTypeProba(BaseModel):
    """Pollution type classification probabilities"""
    clean_air: float = Field(..., ge=0, le=1)
    dust: float = Field(..., ge=0, le=1)
    smoke: float = Field(..., ge=0, le=1)
    voc_chemicals: float = Field(..., ge=0, le=1)
    gas_leak: float = Field(..., ge=0, le=1)
    stuffy: float = Field(..., ge=0, le=1)


class Analysis(BaseModel):
    """Analysis results from ML/rules"""
    eco_index: int = Field(..., ge=0, le=100, description="Ecological index 0-100")
    air_state: str = Field(..., description="Air state classification")
    air_state_proba: AirStateProba = Field(..., description="Air state probabilities")
    pollution_type: str = Field(..., description="Pollution type classification")
    pollution_type_proba: PollutionTypeProba = Field(..., description="Pollution type probabilities")
    microclimate: str = Field(..., description="Microclimate assessment")
    microclimate_flags: list[str] = Field(default_factory=list, description="Microclimate condition flags")
    anomaly: bool = Field(default=False, description="Anomaly detected flag")
    alerts: list[str] = Field(default_factory=list, description="Active alerts")


class Station(BaseModel):
    """Complete station data"""
    station_id: str = Field(..., description="Unique station identifier")
    timestamp: datetime = Field(..., description="Data timestamp")
    location: Location
    env: Environment
    gases: Gases
    dust: Dust
    analysis: Analysis


class LatestResponse(BaseModel):
    """Response for /api/latest endpoint"""
    stations: list[Station]


class HourlyData(BaseModel):
    """Hourly aggregated data for daily profile"""
    hour: int = Field(..., ge=0, le=23)
    eco_index_avg: float
    co2_ppm_avg: float
    dust_mg_m3_avg: float
    temperature_c_avg: float
    humidity_pct_avg: float


class DailyProfileResponse(BaseModel):
    """Response for /api/daily_profile endpoint"""
    station_id: str
    city: str
    date: str
    timezone: str
    daily_profile: list[HourlyData]


# Raw sensor data model (before analysis)
class RawSensorData(BaseModel):
    """Raw sensor readings before analysis"""
    station_id: str
    timestamp: datetime
    lat: float
    lon: float
    alt: float = 0.0
    satellites: int = 0
    gps_fix: bool = True
    temperature_c: float
    humidity_pct: float
    pressure_hpa: float
    co2_ppm: int
    mq135_raw: int
    mq5_raw: int
    gp2y1010_raw: int
    dust_mg_m3: float

