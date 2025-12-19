"""
API Router for Eco Monitoring endpoints
"""
from datetime import datetime
from typing import Optional
from zoneinfo import ZoneInfo
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from app.models import LatestResponse, DailyProfileResponse, HourlyData, RawSensorData
from app.datastore import get_datastore, StationReading, StationStatus
from app.analysis import compute_derived

router = APIRouter()

TZ = ZoneInfo("Asia/Almaty")


# Request model for POST /api/data
class SensorDataRequest(BaseModel):
    """Request body for submitting sensor data"""
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
    gp2y1010_mg_m3: Optional[float] = None  # Alias for dust_mg_m3 (from Raspberry Pi)
    
    @property
    def effective_dust_mg_m3(self) -> Optional[float]:
        """Return dust concentration from either field"""
        return self.dust_mg_m3 or self.gp2y1010_mg_m3


class DataSubmitResponse(BaseModel):
    """Response for data submission"""
    success: bool
    message: str
    station_id: str
    timestamp: datetime
    eco_index: int


# Extended HourlyData that allows nulls
class HourlyDataExtended(BaseModel):
    """Hourly aggregated data for daily profile (allows null values)"""
    hour: int
    eco_index_avg: Optional[float] = None
    co2_ppm_avg: Optional[float] = None
    dust_mg_m3_avg: Optional[float] = None
    temperature_c_avg: Optional[float] = None
    humidity_pct_avg: Optional[float] = None
    has_data: bool = False


class DailyProfileResponseExtended(BaseModel):
    """Response for /api/daily_profile endpoint with real data"""
    station_id: str
    city: str
    date: str
    timezone: str
    current_hour: int
    total_readings: int
    hours_with_data: int
    daily_profile: list[HourlyDataExtended]


@router.post("/data", response_model=DataSubmitResponse)
async def submit_data(data: SensorDataRequest):
    """
    Submit sensor data from a station (Raspberry Pi).
    
    This endpoint receives raw sensor readings and stores them.
    The data is then available via GET /api/latest.
    Data is also aggregated hourly for daily profiles.
    """
    datastore = get_datastore()
    
    # Validate station_id
    known_stations = datastore.get_known_station_ids()
    if data.station_id not in known_stations:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown station_id: {data.station_id}. Known stations: {known_stations}"
        )
    
    # Store the reading
    reading = StationReading(
        station_id=data.station_id,
        lat=data.lat,
        lon=data.lon,
        alt=data.alt,
        temperature_c=data.temperature_c,
        humidity_pct=data.humidity_pct,
        pressure_hpa=data.pressure_hpa,
        co2_ppm=data.co2_ppm,
        mq135_raw=data.mq135_raw,
        mq5_raw=data.mq5_raw,
        gp2y1010_raw=data.gp2y1010_raw,
        dust_mg_m3=data.effective_dust_mg_m3  # Pre-calculated from Raspberry Pi
    )
    
    stored = datastore.store_reading(reading)
    
    # Compute analysis to get eco_index for response
    raw_data = RawSensorData(
        station_id=data.station_id,
        timestamp=stored.timestamp,
        lat=data.lat,
        lon=data.lon,
        alt=data.alt,
        satellites=0,
        gps_fix=True,
        temperature_c=data.temperature_c,
        humidity_pct=data.humidity_pct,
        pressure_hpa=data.pressure_hpa,
        co2_ppm=data.co2_ppm,
        mq135_raw=data.mq135_raw,
        mq5_raw=data.mq5_raw,
        gp2y1010_raw=data.gp2y1010_raw,
        dust_mg_m3=stored.dust_mg_m3
    )
    
    station = compute_derived(raw_data)
    
    return DataSubmitResponse(
        success=True,
        message=f"Data received for station {data.station_id}",
        station_id=data.station_id,
        timestamp=stored.timestamp,
        eco_index=station.analysis.eco_index
    )


@router.get("/latest", response_model=LatestResponse)
async def get_latest(station_id: Optional[str] = Query(None, description="Filter by station ID")):
    """
    Get latest sensor readings for all stations or a specific station.
    
    Returns computed analysis including eco_index, air_state, pollution_type, etc.
    Only returns data for stations that have submitted readings.
    """
    datastore = get_datastore()
    
    if station_id:
        # Get specific station
        stored = datastore.get_reading(station_id)
        if not stored:
            raise HTTPException(
                status_code=404, 
                detail=f"No data for station {station_id}. Station may not have sent data yet."
            )
        stored_data = {station_id: stored}
    else:
        # Get all stations
        stored_data = datastore.get_all_readings()
    
    if not stored_data:
        return LatestResponse(stations=[])
    
    # Convert stored data to Station objects with analysis
    stations = []
    for sid, stored in stored_data.items():
        config = datastore.get_station_config(sid) or {}
        
        raw_data = RawSensorData(
            station_id=sid,
            timestamp=stored.timestamp,
            lat=stored.reading.lat,
            lon=stored.reading.lon,
            alt=stored.reading.alt,
            satellites=8,
            gps_fix=True,
            temperature_c=stored.reading.temperature_c,
            humidity_pct=stored.reading.humidity_pct,
            pressure_hpa=stored.reading.pressure_hpa,
            co2_ppm=stored.reading.co2_ppm,
            mq135_raw=stored.reading.mq135_raw,
            mq5_raw=stored.reading.mq5_raw,
            gp2y1010_raw=stored.reading.gp2y1010_raw,
            dust_mg_m3=stored.dust_mg_m3
        )
        
        station = compute_derived(raw_data)
        stations.append(station)
    
    return LatestResponse(stations=stations)


@router.get("/status", response_model=list[StationStatus])
async def get_status():
    """
    Get status of all stations.
    
    Returns online/offline/no_data status for each known station.
    A station is considered offline if no data received for 3+ hours.
    """
    datastore = get_datastore()
    return datastore.get_all_statuses()


@router.get("/daily_profile", response_model=DailyProfileResponseExtended)
async def get_daily_profile(
    station_id: str = Query(..., description="Station ID"),
    date: Optional[str] = Query(None, description="Date in YYYY-MM-DD format")
):
    """
    Get daily profile (hourly aggregated data) for a specific station.
    
    Returns REAL aggregated data from received readings.
    Hours without data will have null values.
    """
    datastore = get_datastore()
    now = datetime.now(TZ)
    
    # Get station config
    config = datastore.get_station_config(station_id)
    if not config:
        available = datastore.get_known_station_ids()
        raise HTTPException(
            status_code=404,
            detail=f"Station {station_id} not found. Available: {available}"
        )
    
    if date is None:
        date = now.strftime("%Y-%m-%d")
    
    current_hour = now.hour if date == now.strftime("%Y-%m-%d") else 23
    
    # Get real hourly data
    profile_data = datastore.get_daily_profile(station_id, date)
    
    # Convert to response model
    hourly_data = [
        HourlyDataExtended(
            hour=d["hour"],
            eco_index_avg=d["eco_index_avg"],
            co2_ppm_avg=d["co2_ppm_avg"],
            dust_mg_m3_avg=d["dust_mg_m3_avg"],
            temperature_c_avg=d["temperature_c_avg"],
            humidity_pct_avg=d["humidity_pct_avg"],
            has_data=d["has_data"]
        )
        for d in profile_data
    ]
    
    # Calculate stats
    hours_with_data = sum(1 for d in hourly_data if d.has_data)
    
    # Get total readings count
    history = datastore.get_daily_history(station_id, date)
    total_readings = 0
    if history:
        total_readings = sum(h.count for h in history.hours.values())
    
    return DailyProfileResponseExtended(
        station_id=station_id,
        city=config.get("city", "Unknown"),
        date=date,
        timezone=config.get("timezone", "Asia/Almaty"),
        current_hour=current_hour,
        total_readings=total_readings,
        hours_with_data=hours_with_data,
        daily_profile=hourly_data
    )


@router.get("/stations")
async def get_stations():
    """
    Get list of all known stations with their status.
    """
    datastore = get_datastore()
    
    stations = []
    for station_id in datastore.get_known_station_ids():
        config = datastore.get_station_config(station_id)
        status = datastore.get_station_status(station_id)
        stored = datastore.get_reading(station_id)
        
        station_info = {
            "station_id": station_id,
            "city": config.get("city", "Unknown") if config else "Unknown",
            "geo_cluster_label": config.get("geo_cluster_label") if config else None,
            "status": status.status,
            "last_update": status.last_update.isoformat() if status.last_update else None,
        }
        
        if stored:
            station_info["lat"] = stored.reading.lat
            station_info["lon"] = stored.reading.lon
        
        stations.append(station_info)
    
    return {"stations": stations}


@router.get("/history/{station_id}")
async def get_history_stats(station_id: str):
    """
    Get history statistics for a station (debug endpoint).
    Shows how much data is stored for each day/hour.
    """
    datastore = get_datastore()
    
    if station_id not in datastore.get_known_station_ids():
        raise HTTPException(status_code=404, detail=f"Station {station_id} not found")
    
    return datastore.get_history_stats(station_id)
