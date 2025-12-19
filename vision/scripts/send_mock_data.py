"""
Script to send mock sensor data to the API.
Simulates data from Raspberry Pi stations with realistic gradual changes.

Usage:
    python send_mock_data.py              # Send data once for all stations
    python send_mock_data.py --loop       # Send data every 30 seconds (smooth transitions)
    python send_mock_data.py --station eco-astana-01  # Send for specific station

Environment variables:
    API_URL         - API endpoint (default: http://localhost:8000/api/data)
    SEND_INTERVAL   - Interval in seconds for loop mode (default: 30)
"""
import argparse
import os
import random
import time
from datetime import datetime
import requests

# Configuration from environment or defaults
API_URL = os.environ.get("API_URL", "http://localhost:8000/api/data")
DEFAULT_INTERVAL = int(os.environ.get("SEND_INTERVAL", "30"))

# Station configurations (2 stations in Astana)
STATIONS = {
    "eco-astana-01": {
        "lat": 51.1694,
        "lon": 71.4491,
        "alt": 350.0,
        "name": "Центр Астаны",
        "type": "urban_center"
    },
    "eco-astana-02": {
        "lat": 51.1280,
        "lon": 71.4307,
        "alt": 345.0,
        "name": "Промзона Астаны",
        "type": "industrial_zone"
    }
}

# Store previous values for smooth transitions
_previous_values: dict[str, dict] = {}


def get_initial_values(station_type: str) -> dict:
    """Get initial values based on station type."""
    if station_type == "industrial_zone":
        return {
            "co2_ppm": 750,
            "mq135_raw": 2500,
            "mq5_raw": 800,
            "gp2y1010_raw": 2000,
            "temperature_c": -4.0,
            "humidity_pct": 75.0,
            "pressure_hpa": 1013.0
        }
    else:  # urban_center
        return {
            "co2_ppm": 550,
            "mq135_raw": 1800,
            "mq5_raw": 600,
            "gp2y1010_raw": 1400,
            "temperature_c": -3.0,
            "humidity_pct": 72.0,
            "pressure_hpa": 1014.0
        }


def clamp(value: float, min_val: float, max_val: float) -> float:
    """Clamp value between min and max."""
    return max(min_val, min(max_val, value))


def generate_sensor_data(station_id: str) -> dict:
    """
    Generate realistic sensor data with smooth transitions.
    Values change gradually from previous readings.
    """
    config = STATIONS[station_id]
    station_type = config["type"]
    
    # Get previous values or initialize
    if station_id not in _previous_values:
        _previous_values[station_id] = get_initial_values(station_type)
    
    prev = _previous_values[station_id]
    
    # Current hour affects drift direction
    hour = datetime.now().hour
    is_rush_hour = hour in [7, 8, 9, 17, 18, 19]
    is_night = hour < 6 or hour > 22
    is_midday = 11 <= hour <= 14
    
    # Calculate drift direction based on time of day
    co2_drift = 0
    dust_drift = 0
    temp_drift = 0
    
    if is_rush_hour:
        co2_drift = random.randint(5, 20)  # Tends to increase
        dust_drift = random.randint(20, 50)
    elif is_night:
        co2_drift = random.randint(-15, 5)  # Tends to decrease
        dust_drift = random.randint(-30, 10)
    elif is_midday:
        co2_drift = random.randint(0, 15)
        temp_drift = random.uniform(0.1, 0.3)  # Warming up
    
    # Industrial zone has higher baseline drift
    if station_type == "industrial_zone":
        co2_drift += random.randint(0, 10)
        dust_drift += random.randint(10, 30)
    
    # Apply smooth changes (small random walk + drift)
    new_co2 = prev["co2_ppm"] + co2_drift + random.randint(-15, 15)
    new_mq135 = prev["mq135_raw"] + random.randint(-80, 80)
    new_mq5 = prev["mq5_raw"] + random.randint(-40, 40)
    new_dust = prev["gp2y1010_raw"] + dust_drift + random.randint(-60, 60)
    new_temp = prev["temperature_c"] + temp_drift + random.uniform(-0.3, 0.3)
    new_humidity = prev["humidity_pct"] + random.uniform(-1.5, 1.5)
    new_pressure = prev["pressure_hpa"] + random.uniform(-0.5, 0.5)
    
    # Clamp values to realistic ranges
    new_values = {
        "co2_ppm": int(clamp(new_co2, 400, 2000)),
        "mq135_raw": int(clamp(new_mq135, 500, 4000)),
        "mq5_raw": int(clamp(new_mq5, 300, 3500)),
        "gp2y1010_raw": int(clamp(new_dust, 500, 3500)),
        "temperature_c": round(clamp(new_temp, -15.0, 5.0), 1),
        "humidity_pct": round(clamp(new_humidity, 40.0, 95.0), 1),
        "pressure_hpa": round(clamp(new_pressure, 990.0, 1030.0), 1)
    }
    
    # Save for next iteration
    _previous_values[station_id] = new_values
    
    return {
        "station_id": station_id,
        "lat": config["lat"],
        "lon": config["lon"],
        "alt": config["alt"],
        "temperature_c": new_values["temperature_c"],
        "humidity_pct": new_values["humidity_pct"],
        "pressure_hpa": new_values["pressure_hpa"],
        "co2_ppm": new_values["co2_ppm"],
        "mq135_raw": new_values["mq135_raw"],
        "mq5_raw": new_values["mq5_raw"],
        "gp2y1010_raw": new_values["gp2y1010_raw"]
    }


def send_data(station_id: str) -> bool:
    """Send sensor data for a station to the API."""
    data = generate_sensor_data(station_id)
    
    try:
        response = requests.post(API_URL, json=data, timeout=10)
        
        if response.status_code == 200:
            result = response.json()
            print(f"✓ [{station_id}] Data sent successfully!")
            print(f"  Timestamp: {result['timestamp']}")
            print(f"  Eco Index: {result['eco_index']}")
            print(f"  CO2: {data['co2_ppm']} ppm | Dust: {data['gp2y1010_raw']} | Temp: {data['temperature_c']}°C")
            return True
        else:
            print(f"✗ [{station_id}] Error: {response.status_code}")
            print(f"  {response.text}")
            return False
            
    except requests.exceptions.ConnectionError:
        print(f"✗ [{station_id}] Connection error - is the API running on {API_URL}?")
        return False
    except Exception as e:
        print(f"✗ [{station_id}] Error: {e}")
        return False


def send_all_stations():
    """Send data for all stations."""
    print(f"\n{'='*60}")
    print(f"  Sending data at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"{'='*60}")
    
    success_count = 0
    for station_id in STATIONS:
        if send_data(station_id):
            success_count += 1
        print()
    
    print(f"Summary: {success_count}/{len(STATIONS)} stations sent successfully")
    return success_count == len(STATIONS)


def main():
    parser = argparse.ArgumentParser(description="Send mock sensor data to API")
    parser.add_argument("--loop", action="store_true", help="Send data continuously every interval")
    parser.add_argument("--interval", type=int, default=DEFAULT_INTERVAL, help=f"Interval in seconds (default: {DEFAULT_INTERVAL})")
    parser.add_argument("--station", type=str, help="Send only for specific station ID")
    args = parser.parse_args()
    
    print("=" * 60)
    print("  Eco Monitoring - Mock Data Sender (Smooth Transitions)")
    print("=" * 60)
    print(f"API URL: {API_URL}")
    print(f"Stations: {list(STATIONS.keys())}")
    print(f"Mode: {'Loop' if args.loop else 'Single'}")
    
    if args.station:
        if args.station not in STATIONS:
            print(f"\nError: Unknown station '{args.station}'")
            print(f"Available: {list(STATIONS.keys())}")
            return
        
        print(f"\nSending for station: {args.station}")
        send_data(args.station)
        return
    
    if args.loop:
        print(f"\nLoop mode: sending every {args.interval} seconds")
        print("Data will change smoothly between iterations")
        print("Press Ctrl+C to stop\n")
        
        try:
            while True:
                send_all_stations()
                print(f"\nNext update in {args.interval} seconds...")
                time.sleep(args.interval)
        except KeyboardInterrupt:
            print("\n\nStopped by user.")
    else:
        send_all_stations()
        print("\nTip: Use --loop flag to send data continuously")


if __name__ == "__main__":
    main()
