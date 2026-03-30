#!/usr/bin/env python3
"""
Test script to verify both ML models work correctly with sample sensor data
"""
import joblib
import pandas as pd
import numpy as np
import os
from datetime import datetime

# Setup paths
models_dir = os.path.join(os.path.dirname(__file__), 'models')

print("="*70)
print("TESTING ML MODELS WITH SIMULATED SENSOR DATA")
print("="*70)

# Load all models
print("\n[Step 1] Loading models...")
model = joblib.load(os.path.join(models_dir, 'weather_model.pkl'))
label_encoder = joblib.load(os.path.join(models_dir, 'label_encoder.pkl'))
scaler = joblib.load(os.path.join(models_dir, 'weather_scaler.pkl'))
forecast_model = joblib.load(os.path.join(models_dir, 'forecast_model.pkl'))
forecast_encoder = joblib.load(os.path.join(models_dir, 'forecast_encoder.pkl'))
forecast_scaler = joblib.load(os.path.join(models_dir, 'forecast_scaler.pkl'))
print("[OK] All 6 models loaded successfully")

# Create sample sensor data
print("\n[Step 2] Creating sample sensor data...")
now = datetime.now()
sensor_values = {
    "temperature": 28.5,
    "humidity": 65.0,
    "precipitation": 0.0,
    "uv_index": 8.2,
    "pressure": 1012.5,
    "hour_of_day": now.hour,
    "day_of_week": now.weekday(),
    "month": now.month
}
print(f"Sample data: {sensor_values}")

# Test CURRENT WEATHER MODEL
print("\n[Step 3] Testing CURRENT WEATHER MODEL...")
try:
    current_input = pd.DataFrame([[
        sensor_values["temperature"],
        sensor_values["humidity"],
        sensor_values["precipitation"],
        sensor_values["pressure"],
        sensor_values["uv_index"],
        sensor_values["hour_of_day"],
        sensor_values["day_of_week"],
        sensor_values["month"]
    ]], columns=[
        "Temperature", "Humidity", "Precipitation (%)", "Atmospheric Pressure",
        "UV Index", "hour_of_day", "day_of_week", "month"
    ])
    
    current_scaled = scaler.transform(current_input)
    pred = model.predict(current_scaled)
    proba = model.predict_proba(current_scaled)[0]
    confidence = max(proba) * 100
    prediction = label_encoder.inverse_transform(pred)[0]
    
    print(f"[OK] Prediction: {prediction} (Confidence: {confidence:.1f}%)")
    print(f"     Classes available: {list(label_encoder.classes_)}")
except Exception as e:
    print(f"[FAIL] Error: {type(e).__name__} - {e}")

# Test FORECAST MODEL
print("\n[Step 4] Testing 2-HOUR FORECAST MODEL...")
try:
    forecast_input = pd.DataFrame([[
        sensor_values["temperature"],
        sensor_values["humidity"],
        sensor_values["precipitation"],
        sensor_values["uv_index"],
        sensor_values["pressure"],
        sensor_values["hour_of_day"],
        sensor_values["day_of_week"],
        sensor_values["month"]
    ]], columns=[
        "Temperature", "Humidity", "Precipitation (%)", "UV Index",
        "Pressure", "hour_of_day", "day_of_week", "month"
    ])
    
    forecast_scaled = forecast_scaler.transform(forecast_input)
    f_pred = forecast_model.predict(forecast_scaled)
    forecast_prediction = forecast_encoder.inverse_transform(f_pred)[0]
    
    print(f"[OK] Forecast: {forecast_prediction}")
    print(f"     Classes available: {list(forecast_encoder.classes_)}")
except Exception as e:
    print(f"[FAIL] Error: {type(e).__name__} - {e}")

print("\n" + "="*70)
print("TEST COMPLETE")
print("="*70)
