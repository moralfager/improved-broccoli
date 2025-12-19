"""
Generate mock dataset for training ML models
Creates synthetic data that mimics real sensor readings with labeled classes
"""
import random
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from pathlib import Path


def clamp(value: float, min_val: float, max_val: float) -> float:
    """Clamp value between min and max"""
    return max(min_val, min(max_val, value))


def compute_eco_index(co2_ppm: int, dust_mg_m3: float, mq135_raw: int, mq5_raw: int,
                      temperature_c: float, humidity_pct: float) -> int:
    """Compute ecological index (0-100)"""
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


def determine_air_state(eco_index: int) -> str:
    """Determine air state from eco index"""
    if eco_index <= 25:
        return "clean"
    elif eco_index <= 50:
        return "moderate"
    elif eco_index <= 75:
        return "polluted"
    else:
        return "danger"


def generate_scenario_data(scenario: str, n_samples: int) -> list[dict]:
    """Generate data for a specific scenario/pollution type"""
    data = []
    
    for _ in range(n_samples):
        # Base values
        base = {
            "temperature_c": random.uniform(-10, 30),
            "humidity_pct": random.uniform(30, 85),
            "pressure_hpa": random.uniform(1000, 1025),
            "lat": random.uniform(43.0, 52.0),
            "lon": random.uniform(71.0, 77.0),
        }
        
        if scenario == "clean_air":
            # Low all readings
            base["co2_ppm"] = random.randint(400, 550)
            base["mq135_raw"] = random.randint(800, 1400)
            base["mq5_raw"] = random.randint(300, 700)
            base["dust_mg_m3"] = random.uniform(0.005, 0.02)
            
        elif scenario == "dust":
            # High dust, moderate other sensors
            base["co2_ppm"] = random.randint(500, 800)
            base["mq135_raw"] = random.randint(1500, 2200)
            base["mq5_raw"] = random.randint(500, 900)
            base["dust_mg_m3"] = random.uniform(0.08, 0.25)
            
        elif scenario == "smoke":
            # High dust AND high MQ135
            base["co2_ppm"] = random.randint(600, 1000)
            base["mq135_raw"] = random.randint(2500, 3800)
            base["mq5_raw"] = random.randint(600, 1200)
            base["dust_mg_m3"] = random.uniform(0.1, 0.28)
            
        elif scenario == "voc_chemicals":
            # High MQ135, low dust
            base["co2_ppm"] = random.randint(500, 800)
            base["mq135_raw"] = random.randint(2800, 4000)
            base["mq5_raw"] = random.randint(400, 800)
            base["dust_mg_m3"] = random.uniform(0.01, 0.04)
            
        elif scenario == "gas_leak":
            # High MQ5
            base["co2_ppm"] = random.randint(450, 700)
            base["mq135_raw"] = random.randint(1200, 2000)
            base["mq5_raw"] = random.randint(1800, 3500)
            base["dust_mg_m3"] = random.uniform(0.01, 0.03)
            
        elif scenario == "stuffy":
            # High CO2, high humidity
            base["co2_ppm"] = random.randint(900, 1800)
            base["humidity_pct"] = random.uniform(65, 90)
            base["mq135_raw"] = random.randint(1500, 2500)
            base["mq5_raw"] = random.randint(400, 800)
            base["dust_mg_m3"] = random.uniform(0.02, 0.06)
        
        # Compute derived values
        gp2y1010_raw = int(base["dust_mg_m3"] * 10000 + random.randint(-100, 100))
        eco_index = compute_eco_index(
            base["co2_ppm"], base["dust_mg_m3"], 
            base["mq135_raw"], base["mq5_raw"],
            base["temperature_c"], base["humidity_pct"]
        )
        air_state = determine_air_state(eco_index)
        
        # Add computed fields
        base["gp2y1010_raw"] = clamp(gp2y1010_raw, 0, 4095)
        base["eco_index"] = eco_index
        base["air_state"] = air_state
        base["pollution_type"] = scenario
        
        # Add timestamp
        days_ago = random.randint(0, 30)
        hours = random.randint(0, 23)
        base["timestamp"] = (datetime.now() - timedelta(days=days_ago, hours=hours)).isoformat()
        
        data.append(base)
    
    return data


def generate_dataset(n_samples_per_class: int = 500) -> pd.DataFrame:
    """Generate full dataset with all scenarios"""
    scenarios = ["clean_air", "dust", "smoke", "voc_chemicals", "gas_leak", "stuffy"]
    
    all_data = []
    for scenario in scenarios:
        print(f"Generating {n_samples_per_class} samples for scenario: {scenario}")
        scenario_data = generate_scenario_data(scenario, n_samples_per_class)
        all_data.extend(scenario_data)
    
    df = pd.DataFrame(all_data)
    
    # Shuffle the dataset
    df = df.sample(frac=1, random_state=42).reset_index(drop=True)
    
    return df


def add_feature_engineering(df: pd.DataFrame) -> pd.DataFrame:
    """Add engineered features for ML models"""
    
    # Ratio features
    df["co2_dust_ratio"] = df["co2_ppm"] / (df["dust_mg_m3"] * 1000 + 1)
    df["mq135_mq5_ratio"] = df["mq135_raw"] / (df["mq5_raw"] + 1)
    
    # Normalized features (0-1 scale)
    df["co2_norm"] = (df["co2_ppm"] - 400) / (2000 - 400)
    df["co2_norm"] = df["co2_norm"].clip(0, 1)
    
    df["dust_norm"] = df["dust_mg_m3"] / 0.3
    df["dust_norm"] = df["dust_norm"].clip(0, 1)
    
    df["mq135_norm"] = df["mq135_raw"] / 4095
    df["mq5_norm"] = df["mq5_raw"] / 4095
    
    # Temperature comfort zone (deviation from 22°C)
    df["temp_deviation"] = abs(df["temperature_c"] - 22)
    
    # Humidity comfort zone (deviation from 50%)
    df["humidity_deviation"] = abs(df["humidity_pct"] - 50)
    
    # Stuffy indicator
    df["stuffy_score"] = (df["co2_ppm"] / 1000) * (df["humidity_pct"] / 100)
    
    # Gas danger score
    df["gas_danger_score"] = df["mq5_norm"] * 2 + df["mq135_norm"]
    
    return df


def main():
    """Main function to generate and save dataset"""
    print("=" * 50)
    print("Generating mock dataset for ML training")
    print("=" * 50)
    
    # Generate dataset
    df = generate_dataset(n_samples_per_class=500)
    
    # Add engineered features
    df = add_feature_engineering(df)
    
    # Create output directory
    output_dir = Path(__file__).parent / "data"
    output_dir.mkdir(exist_ok=True)
    
    # Save dataset
    output_path = output_dir / "training_data.csv"
    df.to_csv(output_path, index=False)
    print(f"\nDataset saved to: {output_path}")
    
    # Print statistics
    print("\nDataset Statistics:")
    print(f"  Total samples: {len(df)}")
    print(f"\n  Air State distribution:")
    print(df["air_state"].value_counts().to_string())
    print(f"\n  Pollution Type distribution:")
    print(df["pollution_type"].value_counts().to_string())
    
    # Print feature summary
    print("\nFeature Statistics:")
    numeric_cols = ["co2_ppm", "dust_mg_m3", "mq135_raw", "mq5_raw", "eco_index"]
    print(df[numeric_cols].describe().to_string())
    
    return df


if __name__ == "__main__":
    main()

