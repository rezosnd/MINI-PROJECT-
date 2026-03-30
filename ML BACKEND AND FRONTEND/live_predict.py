import os
import serial
import joblib
import pandas as pd
import numpy as np
import time
from datetime import datetime
import collections

# Configuration
SMOOTHING_WINDOW = 5
sensor_history = collections.deque(maxlen=SMOOTHING_WINDOW)

def apply_moving_average_filter(new_values):
    """Apply moving average filter to reduce sensor noise"""
    sensor_history.append(new_values)
    
    if len(sensor_history) == 0:
        return new_values
    
    smoothed = {}
    for key in new_values.keys():
        values = [reading[key] for reading in sensor_history]
        smoothed[key] = np.mean(values)
    
    return smoothed

models_dir = os.path.join(os.path.dirname(__file__), 'models')
def try_load(path_list):
    for p in path_list:
        if os.path.exists(p):
            return joblib.load(p)
    return None

model = try_load([os.path.join(models_dir, 'weather_model.pkl'), 'weather_model.pkl'])
label_encoder = try_load([os.path.join(models_dir, 'label_encoder.pkl'), 'label_encoder.pkl'])
scaler = try_load([os.path.join(models_dir, 'weather_scaler.pkl'), 'weather_scaler.pkl'])
forecast_model = try_load([os.path.join(models_dir, 'forecast_model.pkl'), 'forecast_model.pkl'])
forecast_encoder = try_load([os.path.join(models_dir, 'forecast_encoder.pkl'), 'forecast_encoder.pkl'])
forecast_scaler = try_load([os.path.join(models_dir, 'forecast_scaler.pkl'), 'forecast_scaler.pkl'])

if not (model and label_encoder and scaler and forecast_model and forecast_encoder and forecast_scaler):
    print("✗ Error: One or more model files not found in models/ or project root. Run training scripts first.")
    exit(1)
print("✓ Models loaded successfully")

# Connect to Arduino
print("\n" + "="*70)
print("LIVE WEATHER PREDICTION")
print("="*70)
print("\nConnecting to Arduino...")

try:
    ser = serial.Serial("COM7", 9600, timeout=1)  # Change COM7 to your Arduino port
    print(f"✓ Arduino connected on COM7 (9600 baud)\n")
    time.sleep(2)  # Wait for serial to stabilize
except serial.SerialException as e:
    print(f"✗ Could not connect to Arduino: {e}")
    print("Please check the COM port and ensure Arduino is connected.")
    exit(1)

prediction_history = collections.deque(maxlen=3)
forecast_history = collections.deque(maxlen=3)

def apply_prediction_voting(prediction, history_deque):
    """Apply majority voting to stabilize predictions"""
    history_deque.append(prediction)
    
    if len(history_deque) == 0:
        return prediction
    
    from collections import Counter
    prediction_counts = Counter(history_deque)
    most_common = prediction_counts.most_common(1)[0][0]
    return most_common

print("Listening to Arduino...")
print("-" * 70)

try:
    while True:
        try:
            line = ser.readline().decode('utf-8').strip()

            if line:
                print(f"\n📡 Raw Data: {line}")
                values = line.split(",")

                if len(values) == 5:
                    t, h, p, uv, pres = map(float, values)
                    
                    # Apply noise filtering
                    raw_values = {
                        "temperature": t,
                        "humidity": h,
                        "precipitation": p,
                        "uv_index": uv,
                        "pressure": pres
                    }
                    smoothed_values = apply_moving_average_filter(raw_values)
                    
                    # Get current time features
                    now = datetime.now()
                    hour_of_day = now.hour
                    day_of_week = now.weekday()
                    month = now.month
                    
                    print(f"\n📊 Smoothed Sensor Values:")
                    print(f"   Temperature:  {smoothed_values['temperature']:.2f}°C")
                    print(f"   Humidity:     {smoothed_values['humidity']:.2f}%")
                    print(f"   Precipitation:{smoothed_values['precipitation']:.2f}%")
                    print(f"   UV Index:     {smoothed_values['uv_index']:.2f}")
                    print(f"   Pressure:     {smoothed_values['pressure']:.2f} hPa")
                    print(f"   Time:         {now.strftime('%H:%M:%S')}")
                    
                    # Current Weather Prediction (5 sensors + 3 time features)
                    try:
                        current_input = pd.DataFrame([[
                            smoothed_values['temperature'],
                            smoothed_values['humidity'],
                            smoothed_values['precipitation'],
                            smoothed_values['uv_index'],
                            smoothed_values['pressure'],
                            hour_of_day,
                            day_of_week,
                            month
                        ]], columns=[
                            "Temperature", "Humidity", "Precipitation (%)", "UV Index",
                            "Pressure", "hour_of_day", "day_of_week", "month"
                        ])
                        
                        current_scaled = scaler.transform(current_input)
                        pred = model.predict(current_scaled)
                        proba = model.predict_proba(current_scaled)[0]
                        confidence = max(proba) * 100
                        
                        # Apply majority voting
                        raw_prediction = label_encoder.inverse_transform(pred)[0]
                        stabilized_prediction = apply_prediction_voting(raw_prediction, prediction_history)
                        
                        print(f"\n🌤️  Current Weather:")
                        print(f"   Prediction:   {stabilized_prediction}")
                        print(f"   Confidence:   {confidence:.1f}%")
                    except Exception as e:
                        print(f"   ✗ Prediction error: {e}")
                    
                    # 2-Hour Forecast Prediction
                    try:
                        forecast_input = pd.DataFrame([[
                            smoothed_values['temperature'],
                            smoothed_values['humidity'],
                            smoothed_values['precipitation'],
                            smoothed_values['uv_index'],
                            smoothed_values['pressure'],
                            hour_of_day,
                            day_of_week,
                            month
                        ]], columns=[
                            "Temperature", "Humidity", "Precipitation (%)", "UV Index",
                            "Pressure", "hour_of_day", "day_of_week", "month"
                        ])
                        
                        forecast_scaled = forecast_scaler.transform(forecast_input)
                        f_pred = forecast_model.predict(forecast_scaled)
                        
                        # Apply majority voting
                        raw_forecast = forecast_encoder.inverse_transform(f_pred)[0]
                        stabilized_forecast = apply_prediction_voting(raw_forecast, forecast_history)
                        
                        print(f"\n⏰ 2-Hour Forecast:")
                        print(f"   Prediction:   {stabilized_forecast}")
                    except Exception as e:
                        print(f"   ✗ Forecast error: {e}")
                    
                    print("-" * 70)

        except ValueError as e:
            print(f"   ✗ Parse error: {e}")
        except Exception as e:
            print(f"   ✗ Error: {e}")

except KeyboardInterrupt:
    print("\n\n✓ Stopped by user")
    ser.close()
except Exception as e:
    print(f"\n✗ Serial error: {e}")
    ser.close()
