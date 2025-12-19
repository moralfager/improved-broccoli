"""
ML Service for loading and using trained models
Integrates with the analysis module to provide ML-based predictions
"""
import os
from pathlib import Path
from typing import Optional
import numpy as np
import joblib

from app.models import RawSensorData, AirStateProba, PollutionTypeProba


class MLService:
    """Service for ML model inference"""
    
    def __init__(self, models_dir: Optional[str] = None):
        self.models_dir = Path(models_dir) if models_dir else Path(__file__).parent.parent / "ml_models"
        self.models_loaded = False
        
        # Models
        self.air_state_model = None
        self.air_state_encoder = None
        self.pollution_type_model = None
        self.pollution_type_encoder = None
        self.anomaly_model = None
        self.anomaly_scaler = None
        self.geo_cluster_model = None
        self.geo_cluster_scaler = None
        
        # Try to load models
        self._load_models()
    
    def _load_models(self):
        """Load all trained models if they exist"""
        try:
            # Air state model
            air_state_path = self.models_dir / "air_state_model.joblib"
            air_state_encoder_path = self.models_dir / "air_state_encoder.joblib"
            if air_state_path.exists() and air_state_encoder_path.exists():
                self.air_state_model = joblib.load(air_state_path)
                self.air_state_encoder = joblib.load(air_state_encoder_path)
                print(f"  Loaded air_state model from {air_state_path}")
            
            # Pollution type model
            pollution_type_path = self.models_dir / "pollution_type_model.joblib"
            pollution_type_encoder_path = self.models_dir / "pollution_type_encoder.joblib"
            if pollution_type_path.exists() and pollution_type_encoder_path.exists():
                self.pollution_type_model = joblib.load(pollution_type_path)
                self.pollution_type_encoder = joblib.load(pollution_type_encoder_path)
                print(f"  Loaded pollution_type model from {pollution_type_path}")
            
            # Anomaly detector
            anomaly_path = self.models_dir / "anomaly_detector.joblib"
            anomaly_scaler_path = self.models_dir / "anomaly_scaler.joblib"
            if anomaly_path.exists() and anomaly_scaler_path.exists():
                self.anomaly_model = joblib.load(anomaly_path)
                self.anomaly_scaler = joblib.load(anomaly_scaler_path)
                print(f"  Loaded anomaly detector from {anomaly_path}")
            
            # Geo cluster model
            geo_cluster_path = self.models_dir / "geo_cluster_model.joblib"
            geo_cluster_scaler_path = self.models_dir / "geo_cluster_scaler.joblib"
            if geo_cluster_path.exists() and geo_cluster_scaler_path.exists():
                self.geo_cluster_model = joblib.load(geo_cluster_path)
                self.geo_cluster_scaler = joblib.load(geo_cluster_scaler_path)
                print(f"  Loaded geo_cluster model from {geo_cluster_path}")
            
            self.models_loaded = any([
                self.air_state_model,
                self.pollution_type_model,
                self.anomaly_model,
                self.geo_cluster_model
            ])
            
            if self.models_loaded:
                print("ML models loaded successfully")
            else:
                print("No ML models found, using rule-based analysis")
                
        except Exception as e:
            print(f"Error loading ML models: {e}")
            self.models_loaded = False
    
    def _compute_features(self, raw_data: RawSensorData, eco_index: int) -> dict:
        """Compute features for ML models from raw sensor data"""
        # Normalize features
        co2_norm = max(0, min(1, (raw_data.co2_ppm - 400) / (2000 - 400)))
        dust_norm = max(0, min(1, raw_data.dust_mg_m3 / 0.3))
        mq135_norm = raw_data.mq135_raw / 4095
        mq5_norm = raw_data.mq5_raw / 4095
        
        # Ratio features
        co2_dust_ratio = raw_data.co2_ppm / (raw_data.dust_mg_m3 * 1000 + 1)
        mq135_mq5_ratio = raw_data.mq135_raw / (raw_data.mq5_raw + 1)
        
        # Derived features
        stuffy_score = (raw_data.co2_ppm / 1000) * (raw_data.humidity_pct / 100)
        gas_danger_score = mq5_norm * 2 + mq135_norm
        
        return {
            "co2_ppm": raw_data.co2_ppm,
            "dust_mg_m3": raw_data.dust_mg_m3,
            "mq135_raw": raw_data.mq135_raw,
            "mq5_raw": raw_data.mq5_raw,
            "temperature_c": raw_data.temperature_c,
            "humidity_pct": raw_data.humidity_pct,
            "pressure_hpa": raw_data.pressure_hpa,
            "co2_norm": co2_norm,
            "dust_norm": dust_norm,
            "mq135_norm": mq135_norm,
            "mq5_norm": mq5_norm,
            "eco_index": eco_index,
            "co2_dust_ratio": co2_dust_ratio,
            "mq135_mq5_ratio": mq135_mq5_ratio,
            "stuffy_score": stuffy_score,
            "gas_danger_score": gas_danger_score,
            "lat": raw_data.lat,
            "lon": raw_data.lon,
        }
    
    def predict_air_state(self, raw_data: RawSensorData, eco_index: int) -> tuple[str, AirStateProba]:
        """
        Predict air state using ML model
        Returns: (predicted_class, probabilities)
        """
        if not self.air_state_model:
            return None, None
        
        features = self._compute_features(raw_data, eco_index)
        
        # Feature order for air_state model
        feature_names = [
            "co2_ppm", "dust_mg_m3", "mq135_raw", "mq5_raw",
            "temperature_c", "humidity_pct", "pressure_hpa",
            "co2_norm", "dust_norm", "mq135_norm", "mq5_norm",
            "eco_index"
        ]
        
        X = np.array([[features[f] for f in feature_names]])
        
        # Get prediction and probabilities
        pred_idx = self.air_state_model.predict(X)[0]
        proba = self.air_state_model.predict_proba(X)[0]
        
        predicted_class = self.air_state_encoder.inverse_transform([pred_idx])[0]
        
        # Map probabilities to class names
        class_names = self.air_state_encoder.classes_
        proba_dict = {name: float(proba[i]) for i, name in enumerate(class_names)}
        
        air_state_proba = AirStateProba(
            clean=round(proba_dict.get("clean", 0), 2),
            moderate=round(proba_dict.get("moderate", 0), 2),
            polluted=round(proba_dict.get("polluted", 0), 2),
            danger=round(proba_dict.get("danger", 0), 2)
        )
        
        return predicted_class, air_state_proba
    
    def predict_pollution_type(self, raw_data: RawSensorData, eco_index: int) -> tuple[str, PollutionTypeProba]:
        """
        Predict pollution type using ML model
        Returns: (predicted_class, probabilities)
        """
        if not self.pollution_type_model:
            return None, None
        
        features = self._compute_features(raw_data, eco_index)
        
        # Feature order for pollution_type model
        feature_names = [
            "co2_ppm", "dust_mg_m3", "mq135_raw", "mq5_raw",
            "humidity_pct", "co2_dust_ratio", "mq135_mq5_ratio",
            "co2_norm", "dust_norm", "mq135_norm", "mq5_norm",
            "stuffy_score", "gas_danger_score"
        ]
        
        X = np.array([[features[f] for f in feature_names]])
        
        # Get prediction and probabilities
        pred_idx = self.pollution_type_model.predict(X)[0]
        proba = self.pollution_type_model.predict_proba(X)[0]
        
        predicted_class = self.pollution_type_encoder.inverse_transform([pred_idx])[0]
        
        # Map probabilities to class names
        class_names = self.pollution_type_encoder.classes_
        proba_dict = {name: float(proba[i]) for i, name in enumerate(class_names)}
        
        pollution_type_proba = PollutionTypeProba(
            clean_air=round(proba_dict.get("clean_air", 0), 2),
            dust=round(proba_dict.get("dust", 0), 2),
            smoke=round(proba_dict.get("smoke", 0), 2),
            voc_chemicals=round(proba_dict.get("voc_chemicals", 0), 2),
            gas_leak=round(proba_dict.get("gas_leak", 0), 2),
            stuffy=round(proba_dict.get("stuffy", 0), 2)
        )
        
        return predicted_class, pollution_type_proba
    
    def detect_anomaly(self, raw_data: RawSensorData) -> tuple[bool, float]:
        """
        Detect anomalies in sensor readings
        Returns: (is_anomaly, anomaly_score)
        """
        if not self.anomaly_model or not self.anomaly_scaler:
            return False, 0.0
        
        features = [
            raw_data.co2_ppm,
            raw_data.dust_mg_m3,
            raw_data.mq135_raw,
            raw_data.mq5_raw,
            raw_data.humidity_pct
        ]
        
        X = np.array([features])
        X_scaled = self.anomaly_scaler.transform(X)
        
        # Get prediction (-1 for anomaly, 1 for normal)
        prediction = self.anomaly_model.predict(X_scaled)[0]
        
        # Get anomaly score (negative = more anomalous)
        score = self.anomaly_model.score_samples(X_scaled)[0]
        
        is_anomaly = prediction == -1
        # Normalize score to 0-1 range (higher = more anomalous)
        anomaly_score = 1 - (1 / (1 + np.exp(-score)))
        
        return is_anomaly, float(anomaly_score)
    
    def predict_geo_cluster(self, lat: float, lon: float, eco_index: int) -> tuple[int, str]:
        """
        Predict geo cluster for a location
        Returns: (cluster_id, cluster_label)
        """
        if not self.geo_cluster_model or not self.geo_cluster_scaler:
            return None, None
        
        X = np.array([[lat, lon, eco_index]])
        X_scaled = self.geo_cluster_scaler.transform(X)
        
        cluster_id = int(self.geo_cluster_model.predict(X_scaled)[0])
        
        # Generate cluster label based on cluster characteristics
        cluster_labels = {
            0: "urban_center",
            1: "industrial_zone",
            2: "residential_area",
            3: "suburban",
            4: "rural",
        }
        
        cluster_label = cluster_labels.get(cluster_id, f"cluster_{cluster_id}")
        
        return cluster_id, cluster_label


# Global ML service instance
_ml_service: Optional[MLService] = None


def get_ml_service() -> MLService:
    """Get or create the global ML service instance"""
    global _ml_service
    if _ml_service is None:
        print("Initializing ML Service...")
        _ml_service = MLService()
    return _ml_service


def is_ml_available() -> bool:
    """Check if ML models are available"""
    return get_ml_service().models_loaded

