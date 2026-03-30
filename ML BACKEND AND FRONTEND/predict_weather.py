import joblib
import pandas as pd
import numpy as np

try:
    # Load trained model, encoder, and scaler
    model = joblib.load("weather_model.pkl")
    label_encoder = joblib.load("label_encoder.pkl")
    scaler = joblib.load("weather_scaler.pkl")
    
    # ERROR: This script now requires REAL sensor data
    print("\n" + "="*50)
    print("Error: No Real Sensor Data Provided")
    print("="*50)
    print("\nThis application now uses REAL SENSOR DATA ONLY.")
    print("\nOptions to get real data:")
    print("1. Run the Flask web application: python app.py")
    print("2. Use real Arduino connected with sensor data")
    print("3. Use live_predict.py with Arduino on serial port")
    print("\nNo simulation or fake data is supported.")
    print("="*50 + "\n")
    
except FileNotFoundError as e:
    print(f"Error: Model files not found. Please run train_model.py first.")
    print(f"Details: {e}")
except Exception as e:
    print(f"Error: {e}")
