"""
Analysis module for computing derived metrics from raw sensor data
Implements eco_index calculation, air_state classification, pollution_type detection, and microclimate assessment
Integrates with ML service when models are available
"""
from typing import Optional
from app.models import (
    RawSensorData, Analysis, AirStateProba, PollutionTypeProba,
    Station, Location, Environment, Gases, Dust
)
from app.mock_data import get_station_config

# ML Service integration (lazy import to avoid circular dependencies)
_ml_service = None


def get_ml_service():
    """Get ML service instance (lazy loading)"""
    global _ml_service
    if _ml_service is None:
        try:
            from app.ml_service import get_ml_service as _get_ml_service
            _ml_service = _get_ml_service()
        except Exception as e:
            print(f"ML service not available: {e}")
            _ml_service = False  # Mark as unavailable
    return _ml_service if _ml_service else None


def clamp(value: float, min_val: float, max_val: float) -> float:
    """Clamp value between min and max"""
    return max(min_val, min(max_val, value))


def compute_eco_index(co2_ppm: int, dust_mg_m3: float, mq135_raw: int, mq5_raw: int,
                      temperature_c: float, humidity_pct: float) -> int:
    """
    Compute ecological index (0-100) based on sensor readings
    Higher values indicate worse air quality
    """
    # Normalize sensor values
    co2_norm = clamp((co2_ppm - 400) / (1500 - 400), 0, 1)
    dust_norm = clamp(dust_mg_m3 / 0.25, 0, 1)
    mq135_norm = clamp(mq135_raw / 4095, 0, 1)
    mq5_norm = clamp(mq5_raw / 4095, 0, 1)
    
    # Weighted combination
    eco_index = (0.4 * co2_norm + 0.3 * dust_norm + 0.2 * mq135_norm + 0.1 * mq5_norm) * 100
    
    # Temperature/humidity correction
    if temperature_c < 16 or temperature_c > 28:
        eco_index += 10
    if humidity_pct < 30 or humidity_pct > 70:
        eco_index += 5
    
    return int(clamp(eco_index, 0, 100))


def classify_air_state(eco_index: int) -> tuple[str, AirStateProba]:
    """
    Classify air state based on eco_index
    Returns: (air_state, probabilities)
    """
    # Rule-based classification with soft probabilities
    if eco_index <= 25:
        state = "clean"
        proba = AirStateProba(
            clean=0.85 - eco_index * 0.01,
            moderate=0.10 + eco_index * 0.005,
            polluted=0.03 + eco_index * 0.002,
            danger=0.02 + eco_index * 0.001
        )
    elif eco_index <= 50:
        state = "moderate"
        offset = eco_index - 25
        proba = AirStateProba(
            clean=0.25 - offset * 0.008,
            moderate=0.55 + offset * 0.005,
            polluted=0.15 + offset * 0.006,
            danger=0.05 + offset * 0.002
        )
    elif eco_index <= 75:
        state = "polluted"
        offset = eco_index - 50
        proba = AirStateProba(
            clean=0.05 - offset * 0.001,
            moderate=0.20 - offset * 0.004,
            polluted=0.55 + offset * 0.008,
            danger=0.20 + offset * 0.006
        )
    else:
        state = "danger"
        offset = eco_index - 75
        proba = AirStateProba(
            clean=0.02,
            moderate=0.05,
            polluted=0.25 - offset * 0.005,
            danger=0.68 + offset * 0.008
        )
    
    # Normalize probabilities
    total = proba.clean + proba.moderate + proba.polluted + proba.danger
    return state, AirStateProba(
        clean=round(proba.clean / total, 2),
        moderate=round(proba.moderate / total, 2),
        polluted=round(proba.polluted / total, 2),
        danger=round(proba.danger / total, 2)
    )


def classify_pollution_type(co2_ppm: int, dust_mg_m3: float, mq135_raw: int, 
                            mq5_raw: int, humidity_pct: float) -> tuple[str, PollutionTypeProba]:
    """
    Classify pollution type based on sensor readings
    Returns: (pollution_type, probabilities)
    """
    # Calculate scores for each pollution type
    scores = {
        "clean_air": 0.0,
        "dust": 0.0,
        "smoke": 0.0,
        "voc_chemicals": 0.0,
        "gas_leak": 0.0,
        "stuffy": 0.0
    }
    
    # Clean air - low all readings
    if co2_ppm < 500 and dust_mg_m3 < 0.02 and mq135_raw < 1500:
        scores["clean_air"] = 0.8
    elif co2_ppm < 600 and dust_mg_m3 < 0.04:
        scores["clean_air"] = 0.4
    else:
        scores["clean_air"] = 0.1
    
    # Dust - high dust, moderate other sensors
    dust_score = clamp(dust_mg_m3 / 0.15, 0, 1)
    if dust_mg_m3 > 0.05 and mq135_raw < 2500:
        scores["dust"] = 0.3 + dust_score * 0.5
    else:
        scores["dust"] = dust_score * 0.3
    
    # Smoke - high dust AND high MQ135
    if dust_mg_m3 > 0.08 and mq135_raw > 2500:
        scores["smoke"] = 0.6 + clamp((mq135_raw - 2500) / 1500, 0, 0.3)
    elif dust_mg_m3 > 0.05 and mq135_raw > 2000:
        scores["smoke"] = 0.3
    else:
        scores["smoke"] = 0.05
    
    # VOC/Chemicals - high MQ135, low dust
    if mq135_raw > 2500 and dust_mg_m3 < 0.05:
        scores["voc_chemicals"] = 0.5 + clamp((mq135_raw - 2500) / 1500, 0, 0.4)
    elif mq135_raw > 2000:
        scores["voc_chemicals"] = 0.2
    else:
        scores["voc_chemicals"] = 0.05
    
    # Gas leak - high MQ5
    if mq5_raw > 1500:
        scores["gas_leak"] = 0.5 + clamp((mq5_raw - 1500) / 2500, 0, 0.45)
    elif mq5_raw > 1000:
        scores["gas_leak"] = 0.2
    else:
        scores["gas_leak"] = 0.03
    
    # Stuffy - high CO2, high humidity
    if co2_ppm > 800 and humidity_pct > 65:
        scores["stuffy"] = 0.4 + clamp((co2_ppm - 800) / 700, 0, 0.4)
    elif co2_ppm > 700:
        scores["stuffy"] = 0.2
    else:
        scores["stuffy"] = 0.05
    
    # Normalize to probabilities
    total = sum(scores.values())
    if total == 0:
        total = 1
    
    proba = PollutionTypeProba(
        clean_air=round(scores["clean_air"] / total, 2),
        dust=round(scores["dust"] / total, 2),
        smoke=round(scores["smoke"] / total, 2),
        voc_chemicals=round(scores["voc_chemicals"] / total, 2),
        gas_leak=round(scores["gas_leak"] / total, 2),
        stuffy=round(scores["stuffy"] / total, 2)
    )
    
    # Get dominant type
    pollution_type = max(scores, key=scores.get)
    
    return pollution_type, proba


def assess_microclimate(temperature_c: float, humidity_pct: float, 
                        co2_ppm: int) -> tuple[str, list[str]]:
    """
    Assess microclimate conditions
    Returns: (microclimate_state, flags)
    """
    flags = []
    
    # Temperature assessment
    if temperature_c < 16:
        flags.append("too_cold")
    elif temperature_c > 28:
        flags.append("too_hot")
    
    # Humidity assessment
    if humidity_pct < 30:
        flags.append("too_dry")
    elif humidity_pct > 70:
        flags.append("too_humid")
    
    if humidity_pct > 80:
        flags.append("risk_mold")
    
    # Stuffiness (CO2 + humidity)
    if co2_ppm > 800:
        flags.append("stuffy")
    
    if co2_ppm > 1200:
        flags.append("poor_ventilation")
    
    # Determine overall state
    if not flags:
        state = "comfortable"
    elif "stuffy" in flags or "poor_ventilation" in flags:
        state = "stuffy"
    elif "too_dry" in flags:
        state = "too_dry"
    elif "too_humid" in flags or "risk_mold" in flags:
        state = "too_humid"
    else:
        state = "uncomfortable"
    
    return state, flags


def generate_alerts(eco_index: int, co2_ppm: int, dust_mg_m3: float,
                    mq135_raw: int, mq5_raw: int) -> list[str]:
    """Generate alert messages based on sensor readings"""
    alerts = []
    
    if co2_ppm > 1000:
        alerts.append("CO2_high")
    elif co2_ppm > 800:
        alerts.append("CO2_elevated")
    
    if dust_mg_m3 > 0.15:
        alerts.append("Dust_high")
    elif dust_mg_m3 > 0.08:
        alerts.append("Dust_elevated")
    
    if mq135_raw > 3000:
        alerts.append("VOC_high")
    elif mq135_raw > 2500:
        alerts.append("VOC_elevated")
    
    if mq5_raw > 2000:
        alerts.append("Gas_leak_warning")
    elif mq5_raw > 1500:
        alerts.append("Combustible_gas_elevated")
    
    if eco_index > 75:
        alerts.append("Air_quality_danger")
    elif eco_index > 50:
        alerts.append("Air_quality_poor")
    
    return alerts


def compute_derived(raw_data: RawSensorData, use_ml: bool = True) -> Station:
    """
    Compute all derived metrics from raw sensor data
    Main function that combines all analysis
    
    Args:
        raw_data: Raw sensor readings
        use_ml: Whether to use ML models if available (default True)
    """
    # Compute eco index (always rule-based as it's the foundation)
    eco_index = compute_eco_index(
        co2_ppm=raw_data.co2_ppm,
        dust_mg_m3=raw_data.dust_mg_m3,
        mq135_raw=raw_data.mq135_raw,
        mq5_raw=raw_data.mq5_raw,
        temperature_c=raw_data.temperature_c,
        humidity_pct=raw_data.humidity_pct
    )
    
    # Try to use ML models if available
    ml_service = get_ml_service() if use_ml else None
    
    # Classify air state (ML or rule-based)
    if ml_service and ml_service.air_state_model:
        ml_air_state, ml_air_state_proba = ml_service.predict_air_state(raw_data, eco_index)
        if ml_air_state and ml_air_state_proba:
            air_state, air_state_proba = ml_air_state, ml_air_state_proba
        else:
            air_state, air_state_proba = classify_air_state(eco_index)
    else:
        air_state, air_state_proba = classify_air_state(eco_index)
    
    # Classify pollution type (ML or rule-based)
    if ml_service and ml_service.pollution_type_model:
        ml_pollution_type, ml_pollution_type_proba = ml_service.predict_pollution_type(raw_data, eco_index)
        if ml_pollution_type and ml_pollution_type_proba:
            pollution_type, pollution_type_proba = ml_pollution_type, ml_pollution_type_proba
        else:
            pollution_type, pollution_type_proba = classify_pollution_type(
                co2_ppm=raw_data.co2_ppm,
                dust_mg_m3=raw_data.dust_mg_m3,
                mq135_raw=raw_data.mq135_raw,
                mq5_raw=raw_data.mq5_raw,
                humidity_pct=raw_data.humidity_pct
            )
    else:
        pollution_type, pollution_type_proba = classify_pollution_type(
            co2_ppm=raw_data.co2_ppm,
            dust_mg_m3=raw_data.dust_mg_m3,
            mq135_raw=raw_data.mq135_raw,
            mq5_raw=raw_data.mq5_raw,
            humidity_pct=raw_data.humidity_pct
        )
    
    # Assess microclimate (always rule-based)
    microclimate, microclimate_flags = assess_microclimate(
        temperature_c=raw_data.temperature_c,
        humidity_pct=raw_data.humidity_pct,
        co2_ppm=raw_data.co2_ppm
    )
    
    # Generate alerts
    alerts = generate_alerts(
        eco_index=eco_index,
        co2_ppm=raw_data.co2_ppm,
        dust_mg_m3=raw_data.dust_mg_m3,
        mq135_raw=raw_data.mq135_raw,
        mq5_raw=raw_data.mq5_raw
    )
    
    # Detect anomalies (ML only)
    anomaly = False
    if ml_service and ml_service.anomaly_model:
        is_anomaly, anomaly_score = ml_service.detect_anomaly(raw_data)
        anomaly = is_anomaly
        if is_anomaly:
            alerts.append(f"Anomaly_detected")
    
    # Get station config for geo cluster info
    station_config = get_station_config(raw_data.station_id)
    geo_cluster = station_config.get("geo_cluster") if station_config else None
    geo_cluster_label = station_config.get("geo_cluster_label") if station_config else None
    
    # Try ML-based geo clustering
    if ml_service and ml_service.geo_cluster_model:
        ml_geo_cluster, ml_geo_label = ml_service.predict_geo_cluster(
            raw_data.lat, raw_data.lon, eco_index
        )
        if ml_geo_cluster is not None:
            geo_cluster = ml_geo_cluster
            geo_cluster_label = ml_geo_label
    
    # Build complete Station object
    station = Station(
        station_id=raw_data.station_id,
        timestamp=raw_data.timestamp,
        location=Location(
            lat=raw_data.lat,
            lon=raw_data.lon,
            alt=raw_data.alt,
            satellites=raw_data.satellites,
            gps_fix=raw_data.gps_fix,
            geo_cluster=geo_cluster,
            geo_cluster_label=geo_cluster_label
        ),
        env=Environment(
            temperature_c=raw_data.temperature_c,
            humidity_pct=raw_data.humidity_pct,
            pressure_hpa=raw_data.pressure_hpa
        ),
        gases=Gases(
            co2_ppm=raw_data.co2_ppm,
            mq135_raw=raw_data.mq135_raw,
            mq5_raw=raw_data.mq5_raw
        ),
        dust=Dust(
            gp2y1010_raw=raw_data.gp2y1010_raw,
            dust_mg_m3=raw_data.dust_mg_m3
        ),
        analysis=Analysis(
            eco_index=eco_index,
            air_state=air_state,
            air_state_proba=air_state_proba,
            pollution_type=pollution_type,
            pollution_type_proba=pollution_type_proba,
            microclimate=microclimate,
            microclimate_flags=microclimate_flags,
            anomaly=anomaly,
            alerts=alerts
        )
    )
    
    return station

