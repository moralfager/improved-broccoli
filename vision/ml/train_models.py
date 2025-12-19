"""
Train ML models for air quality classification
- RandomForestClassifier for air_state classification
- RandomForestClassifier for pollution_type classification
- KMeans for geo-clustering (optional)
"""
import json
from pathlib import Path
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.ensemble import RandomForestClassifier, IsolationForest
from sklearn.cluster import KMeans
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score
import joblib


# Feature columns for models
AIR_STATE_FEATURES = [
    "co2_ppm", "dust_mg_m3", "mq135_raw", "mq5_raw",
    "temperature_c", "humidity_pct", "pressure_hpa",
    "co2_norm", "dust_norm", "mq135_norm", "mq5_norm",
    "eco_index"
]

POLLUTION_TYPE_FEATURES = [
    "co2_ppm", "dust_mg_m3", "mq135_raw", "mq5_raw",
    "humidity_pct", "co2_dust_ratio", "mq135_mq5_ratio",
    "co2_norm", "dust_norm", "mq135_norm", "mq5_norm",
    "stuffy_score", "gas_danger_score"
]

GEO_CLUSTER_FEATURES = ["lat", "lon", "eco_index"]


def load_dataset(data_path: Path) -> pd.DataFrame:
    """Load training dataset"""
    print(f"Loading dataset from: {data_path}")
    df = pd.read_csv(data_path)
    print(f"  Loaded {len(df)} samples")
    return df


def train_air_state_model(df: pd.DataFrame, models_dir: Path) -> dict:
    """Train RandomForestClassifier for air state classification"""
    print("\n" + "=" * 50)
    print("Training Air State Classifier")
    print("=" * 50)
    
    # Prepare data
    X = df[AIR_STATE_FEATURES].copy()
    y = df["air_state"].copy()
    
    # Encode labels
    le = LabelEncoder()
    y_encoded = le.fit_transform(y)
    
    # Split data
    X_train, X_test, y_train, y_test = train_test_split(
        X, y_encoded, test_size=0.2, random_state=42, stratify=y_encoded
    )
    
    # Train model
    model = RandomForestClassifier(
        n_estimators=100,
        max_depth=15,
        min_samples_split=5,
        min_samples_leaf=2,
        random_state=42,
        n_jobs=-1
    )
    
    print("  Training RandomForest...")
    model.fit(X_train, y_train)
    
    # Evaluate
    y_pred = model.predict(X_test)
    accuracy = accuracy_score(y_test, y_pred)
    
    print(f"\n  Accuracy: {accuracy:.4f}")
    print("\n  Classification Report:")
    print(classification_report(y_test, y_pred, target_names=le.classes_))
    
    # Cross-validation
    cv_scores = cross_val_score(model, X, y_encoded, cv=5)
    print(f"  Cross-validation scores: {cv_scores}")
    print(f"  Mean CV score: {cv_scores.mean():.4f} (+/- {cv_scores.std() * 2:.4f})")
    
    # Feature importance
    feature_importance = dict(zip(AIR_STATE_FEATURES, model.feature_importances_))
    print("\n  Feature Importance:")
    for feat, imp in sorted(feature_importance.items(), key=lambda x: -x[1])[:5]:
        print(f"    {feat}: {imp:.4f}")
    
    # Save model and encoder
    model_path = models_dir / "air_state_model.joblib"
    encoder_path = models_dir / "air_state_encoder.joblib"
    
    joblib.dump(model, model_path)
    joblib.dump(le, encoder_path)
    
    print(f"\n  Model saved to: {model_path}")
    
    return {
        "accuracy": accuracy,
        "cv_mean": cv_scores.mean(),
        "classes": le.classes_.tolist(),
        "features": AIR_STATE_FEATURES
    }


def train_pollution_type_model(df: pd.DataFrame, models_dir: Path) -> dict:
    """Train RandomForestClassifier for pollution type classification"""
    print("\n" + "=" * 50)
    print("Training Pollution Type Classifier")
    print("=" * 50)
    
    # Prepare data
    X = df[POLLUTION_TYPE_FEATURES].copy()
    y = df["pollution_type"].copy()
    
    # Encode labels
    le = LabelEncoder()
    y_encoded = le.fit_transform(y)
    
    # Split data
    X_train, X_test, y_train, y_test = train_test_split(
        X, y_encoded, test_size=0.2, random_state=42, stratify=y_encoded
    )
    
    # Train model
    model = RandomForestClassifier(
        n_estimators=150,
        max_depth=20,
        min_samples_split=4,
        min_samples_leaf=2,
        random_state=42,
        n_jobs=-1
    )
    
    print("  Training RandomForest...")
    model.fit(X_train, y_train)
    
    # Evaluate
    y_pred = model.predict(X_test)
    accuracy = accuracy_score(y_test, y_pred)
    
    print(f"\n  Accuracy: {accuracy:.4f}")
    print("\n  Classification Report:")
    print(classification_report(y_test, y_pred, target_names=le.classes_))
    
    # Cross-validation
    cv_scores = cross_val_score(model, X, y_encoded, cv=5)
    print(f"  Cross-validation scores: {cv_scores}")
    print(f"  Mean CV score: {cv_scores.mean():.4f} (+/- {cv_scores.std() * 2:.4f})")
    
    # Feature importance
    feature_importance = dict(zip(POLLUTION_TYPE_FEATURES, model.feature_importances_))
    print("\n  Feature Importance:")
    for feat, imp in sorted(feature_importance.items(), key=lambda x: -x[1])[:5]:
        print(f"    {feat}: {imp:.4f}")
    
    # Save model and encoder
    model_path = models_dir / "pollution_type_model.joblib"
    encoder_path = models_dir / "pollution_type_encoder.joblib"
    
    joblib.dump(model, model_path)
    joblib.dump(le, encoder_path)
    
    print(f"\n  Model saved to: {model_path}")
    
    return {
        "accuracy": accuracy,
        "cv_mean": cv_scores.mean(),
        "classes": le.classes_.tolist(),
        "features": POLLUTION_TYPE_FEATURES
    }


def train_geo_clustering(df: pd.DataFrame, models_dir: Path, n_clusters: int = 5) -> dict:
    """Train KMeans for geo-clustering"""
    print("\n" + "=" * 50)
    print("Training Geo Clustering (KMeans)")
    print("=" * 50)
    
    # Prepare data
    X = df[GEO_CLUSTER_FEATURES].copy()
    
    # Scale features
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    
    # Train KMeans
    model = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
    
    print(f"  Training KMeans with {n_clusters} clusters...")
    model.fit(X_scaled)
    
    # Get cluster labels
    df["geo_cluster"] = model.labels_
    
    # Analyze clusters
    print("\n  Cluster Analysis:")
    for i in range(n_clusters):
        cluster_data = df[df["geo_cluster"] == i]
        print(f"\n  Cluster {i} ({len(cluster_data)} samples):")
        print(f"    Avg eco_index: {cluster_data['eco_index'].mean():.2f}")
        print(f"    Lat range: {cluster_data['lat'].min():.2f} - {cluster_data['lat'].max():.2f}")
        print(f"    Lon range: {cluster_data['lon'].min():.2f} - {cluster_data['lon'].max():.2f}")
    
    # Save model and scaler
    model_path = models_dir / "geo_cluster_model.joblib"
    scaler_path = models_dir / "geo_cluster_scaler.joblib"
    
    joblib.dump(model, model_path)
    joblib.dump(scaler, scaler_path)
    
    print(f"\n  Model saved to: {model_path}")
    
    return {
        "n_clusters": n_clusters,
        "inertia": model.inertia_,
        "features": GEO_CLUSTER_FEATURES
    }


def train_anomaly_detector(df: pd.DataFrame, models_dir: Path) -> dict:
    """Train IsolationForest for anomaly detection"""
    print("\n" + "=" * 50)
    print("Training Anomaly Detector (IsolationForest)")
    print("=" * 50)
    
    # Use only "clean" data for training anomaly detector
    clean_df = df[df["pollution_type"] == "clean_air"].copy()
    
    features = ["co2_ppm", "dust_mg_m3", "mq135_raw", "mq5_raw", "humidity_pct"]
    X = clean_df[features].copy()
    
    # Scale features
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    
    # Train IsolationForest
    model = IsolationForest(
        n_estimators=100,
        contamination=0.05,
        random_state=42,
        n_jobs=-1
    )
    
    print(f"  Training on {len(clean_df)} clean samples...")
    model.fit(X_scaled)
    
    # Test on full dataset
    X_all = df[features].copy()
    X_all_scaled = scaler.transform(X_all)
    predictions = model.predict(X_all_scaled)
    
    n_anomalies = (predictions == -1).sum()
    print(f"\n  Detected {n_anomalies} anomalies in full dataset ({n_anomalies/len(df)*100:.1f}%)")
    
    # Save model and scaler
    model_path = models_dir / "anomaly_detector.joblib"
    scaler_path = models_dir / "anomaly_scaler.joblib"
    
    joblib.dump(model, model_path)
    joblib.dump(scaler, scaler_path)
    
    print(f"\n  Model saved to: {model_path}")
    
    return {
        "n_training_samples": len(clean_df),
        "anomalies_detected": int(n_anomalies),
        "features": features
    }


def main():
    """Main training pipeline"""
    print("=" * 60)
    print("  ML Model Training Pipeline for Eco Monitoring")
    print("=" * 60)
    
    # Paths
    ml_dir = Path(__file__).parent
    data_path = ml_dir / "data" / "training_data.csv"
    models_dir = ml_dir / "models"
    models_dir.mkdir(exist_ok=True)
    
    # Check if dataset exists
    if not data_path.exists():
        print(f"\nDataset not found at {data_path}")
        print("Run prepare_mock_data.py first to generate the dataset")
        return
    
    # Load dataset
    df = load_dataset(data_path)
    
    # Train models
    results = {}
    
    results["air_state"] = train_air_state_model(df, models_dir)
    results["pollution_type"] = train_pollution_type_model(df, models_dir)
    results["geo_cluster"] = train_geo_clustering(df, models_dir)
    results["anomaly"] = train_anomaly_detector(df, models_dir)
    
    # Save training results metadata
    metadata_path = models_dir / "training_metadata.json"
    with open(metadata_path, "w") as f:
        json.dump(results, f, indent=2)
    
    print("\n" + "=" * 60)
    print("  Training Complete!")
    print("=" * 60)
    print(f"\nModels saved to: {models_dir}")
    print(f"Metadata saved to: {metadata_path}")
    
    # Summary
    print("\nModel Performance Summary:")
    print(f"  Air State Classifier: {results['air_state']['accuracy']:.2%} accuracy")
    print(f"  Pollution Type Classifier: {results['pollution_type']['accuracy']:.2%} accuracy")
    print(f"  Geo Clustering: {results['geo_cluster']['n_clusters']} clusters")
    print(f"  Anomaly Detector: trained on {results['anomaly']['n_training_samples']} samples")


if __name__ == "__main__":
    main()

