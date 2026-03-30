from flask import Flask, render_template, jsonify
import joblib
import pandas as pd
import numpy as np
import serial
import serial.tools.list_ports
import threading
import time
import collections
import urllib.request
import json
from datetime import datetime

app = Flask(__name__)

import csv
import os

# Configuration — Arduino only, no simulation
ARDUINO_PORT = 'COM7'  # Default port; overridden by user via Engine Controls
ARDUINO_BAUD = 9600    # Must match the baud rate in the Arduino sketch
ARDUINO_CONNECTION_TIMEOUT = 30

# WeatherAPI — real-world ground truth for model comparison
WEATHER_API_KEY      = "75e13e8b70b84926bab65259262903"
WEATHER_API_URL      = (f"https://api.weatherapi.com/v1/current.json"
                        f"?key={WEATHER_API_KEY}&q=auto:ip")
WEATHER_API_INTERVAL = 300   # seconds between API refreshes (5 min)

# Rolling-window model scores: track last N (hit=1/miss=0) per model
# Using a rolling window prevents stale cumulative scores from dominating.
_SCORE_WINDOW = 50
_model_score_history = {
    "decision_tree":     collections.deque(maxlen=_SCORE_WINDOW),
    "gradient_boosting": collections.deque(maxlen=_SCORE_WINDOW),
    "knn":               collections.deque(maxlen=_SCORE_WINDOW),
    "random_forest":     collections.deque(maxlen=_SCORE_WINDOW),
}
# Keep integer counts for backward-compat display (sum of rolling window)
_model_scores = {"decision_tree": 0, "gradient_boosting": 0, "knn": 0, "random_forest": 0}
_MODEL_LABELS = {
    "decision_tree":      "Decision Tree",
    "gradient_boosting":  "Gradient Boosting",
    "knn":                "KNN",
    "random_forest":      "Random Forest",
}

# Sensor noise filtering configuration
SMOOTHING_WINDOW = 5  # Number of readings for moving average
sensor_history = collections.deque(maxlen=SMOOTHING_WINDOW)

# Prediction stabilization configuration
PREDICTION_VOTING_WINDOW = 5  # Last N predictions for majority voting (increased for stability)
prediction_history = collections.deque(maxlen=PREDICTION_VOTING_WINDOW)
forecast_history = collections.deque(maxlen=PREDICTION_VOTING_WINDOW)

# Model globals — populated once by load_models()
model = None
label_encoder = None
scaler = None
forecast_model = None
forecast_encoder = None
forecast_scaler = None

# Multi-model globals (Decision Tree / Gradient Boosting / KNN / Random Forest)
dt_current_model  = None
gb_current_model  = None
knn_current_model = None
dt_forecast_model  = None
gb_forecast_model  = None
knn_forecast_model = None
model_accuracies   = {}   # populated from models/model_accuracies.json

# Simulation mode flag + thread reference
SIMULATION_MODE   = False
_sim_thread       = None
_sim_thread_lock  = threading.Lock()

# Guard so models are only loaded once even if the module is re-imported
# (gunicorn --reload re-imports on file changes; this prevents duplicate loads
# and avoids race conditions with partial pickle reads)
_models_loaded = False
_models_lock = threading.Lock()

# Resolve the absolute base directory once at import time so __file__ can
# never be a bare relative path (e.g. "app.py") that makes dirname() empty.
_BASE_DIR = os.path.dirname(os.path.abspath(__file__))
_MODEL_DIR = os.path.join(_BASE_DIR, 'models')

_MODEL_PATHS = {
    'model':           ['random_forest_current.pkl', 'weather_model.pkl'],
    'label':           ['label_encoder.pkl'],
    'scaler':          ['weather_scaler.pkl'],
    'forecast_model':  ['forecast_model.pkl'],
    'forecast_encoder':['forecast_encoder.pkl'],
    'forecast_scaler': ['forecast_scaler.pkl'],
}

def _try_load(path):
    """Load a single pkl file safely, returning None on any failure."""
    if not os.path.exists(path):
        print(f"  - Missing: {path}")
        return None
    try:
        obj = joblib.load(path)
        print(f"  + Loaded: {path}")
        return obj
    except Exception as e:
        print(f"  ! Error loading {path}: {type(e).__name__} - {e}")
        return None

def _resolve(filename):
    """Return the first existing path for a model filename.

    Checks models/ sub-directory first, then falls back to the project root.
    Returns None if the file cannot be found in either location.
    """
    candidates = [
        os.path.join(_MODEL_DIR, filename),
        os.path.join(_BASE_DIR, filename),
    ]
    for path in candidates:
        if os.path.exists(path):
            return path
    return candidates[0]  # return primary path so the missing-file log is clear

def load_models():
    """Load all ML models exactly once.

    Thread-safe: subsequent calls (e.g. from gunicorn worker reloads) are
    no-ops once the first load has succeeded.
    """
    global _models_loaded
    global model, label_encoder, scaler
    global forecast_model, forecast_encoder, forecast_scaler
    global dt_current_model, gb_current_model, knn_current_model
    global dt_forecast_model, gb_forecast_model, knn_forecast_model
    global model_accuracies

    with _models_lock:
        if _models_loaded:
            return

        print("\n" + "=" * 70)
        print("LOADING MODELS")
        print("=" * 70)

        model           = _try_load(_resolve(_MODEL_PATHS['model'][0]))
        label_encoder   = _try_load(_resolve(_MODEL_PATHS['label'][0]))
        scaler          = _try_load(_resolve(_MODEL_PATHS['scaler'][0]))
        forecast_model  = _try_load(_resolve(_MODEL_PATHS['forecast_model'][0]))
        forecast_encoder= _try_load(_resolve(_MODEL_PATHS['forecast_encoder'][0]))
        forecast_scaler = _try_load(_resolve(_MODEL_PATHS['forecast_scaler'][0]))

        # Multi-model variants
        dt_current_model   = _try_load(_resolve('decision_tree_current.pkl'))
        gb_current_model   = _try_load(_resolve('gradient_boosting_current.pkl'))
        knn_current_model  = _try_load(_resolve('knn_current.pkl'))
        dt_forecast_model  = _try_load(_resolve('decision_tree_forecast.pkl'))
        gb_forecast_model  = _try_load(_resolve('gradient_boosting_forecast.pkl'))
        knn_forecast_model = _try_load(_resolve('knn_forecast.pkl'))

        # Load pre-computed training accuracies
        accs_path = _resolve('model_accuracies.json')
        if accs_path and os.path.exists(accs_path):
            try:
                import json as _json
                with open(accs_path) as _f:
                    model_accuracies = _json.load(_f)
                print(f"  + Loaded: {accs_path}")
            except Exception as _e:
                print(f"  ! Could not load model_accuracies.json: {_e}")

        print("=" * 70)

        # ── Validate feature names stored inside each scaler ──────────────
        # The canonical feature order used everywhere (app.py + train_forecast.py):
        EXPECTED_FEATURES = [
            "Temperature", "Humidity", "Precipitation (%)",
            "UV Index", "Pressure",
            "hour_of_day", "day_of_week", "month"
        ]

        def _validate_scaler(name, s):
            if s is None:
                return
            if hasattr(s, "feature_names_in_"):
                actual = list(s.feature_names_in_)
                if actual != EXPECTED_FEATURES:
                    print(f"  [WARN] {name} feature mismatch!")
                    print(f"    Expected : {EXPECTED_FEATURES}")
                    print(f"    Got      : {actual}")
                    print(f"    Predictions may be wrong — retrain the model.")
                else:
                    print(f"  [OK]  {name} features verified: {actual}")
            else:
                print(f"  [INFO] {name}: feature_names_in_ not available (older sklearn)")

        print("FEATURE VALIDATION")
        _validate_scaler("weather_scaler", scaler)
        _validate_scaler("forecast_scaler", forecast_scaler)

        # ── Warn about stale root-level pkl files ─────────────────────────
        stale = []
        for fname in ["weather_scaler.pkl", "forecast_scaler.pkl",
                      "weather_model.pkl", "forecast_model.pkl",
                      "label_encoder.pkl", "forecast_encoder.pkl"]:
            root_path = os.path.join(_BASE_DIR, fname)
            models_path = os.path.join(_MODEL_DIR, fname)
            if os.path.exists(root_path) and os.path.exists(models_path):
                stale.append(fname)
        if stale:
            print(f"  [WARN] Stale root-level pkl files found (shadowed by models/): {stale}")
            print(f"         Remove them to avoid confusion: they may have wrong feature sets.")

        print("=" * 70)
        if model and label_encoder and scaler:
            print("[OK] Current weather prediction models loaded successfully")
        else:
            missing = [n for n, v in [("weather_model", model), ("label_encoder", label_encoder), ("weather_scaler", scaler)] if not v]
            print(f"[WARN] Current weather models missing: {', '.join(missing)}")
            print("[INFO] Dashboard will run; predictions will be unavailable until models are present.")

        if forecast_model and forecast_encoder and forecast_scaler:
            print("[OK] Forecast prediction models loaded successfully")
        else:
            missing = [n for n, v in [("forecast_model", forecast_model), ("forecast_encoder", forecast_encoder), ("forecast_scaler", forecast_scaler)] if not v]
            print(f"[WARN] Forecast models missing: {', '.join(missing)}")
            print("[INFO] Dashboard will run; forecast will be unavailable until models are present.")

        print("=" * 70)
        _models_loaded = True

load_models()

def _map_condition(text):
    """Map a WeatherAPI condition string to Sunny / Cloudy / Rainy."""
    t = text.lower()
    if any(w in t for w in ['rain', 'drizzle', 'thunder', 'shower', 'sleet', 'snow', 'blizzard', 'ice']):
        return 'Rainy'
    if any(w in t for w in ['cloud', 'overcast', 'fog', 'mist', 'haze', 'smoke', 'freezing']):
        return 'Cloudy'
    # Sunny / Clear / Partly sunny etc.
    return 'Sunny'


def _fetch_actual_weather():
    """Call WeatherAPI and return (mapped_label, raw_text) or (None, None) on error."""
    try:
        req = urllib.request.Request(
            WEATHER_API_URL,
            headers={'User-Agent': 'ClimaSenseG18/2.0'}
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode())
        raw    = data["current"]["condition"]["text"]
        mapped = _map_condition(raw)
        print(f"[WeatherAPI] {raw!r} → {mapped}")
        return mapped, raw
    except Exception as e:
        print(f"[WeatherAPI] Fetch failed: {type(e).__name__} - {e}")
        return None, None


def _weather_api_loop():
    """Background daemon thread: refresh actual weather every WEATHER_API_INTERVAL seconds."""
    while True:
        mapped, raw = _fetch_actual_weather()
        if mapped:
            with data_lock:
                sensor_data["actual_weather"]     = mapped
                sensor_data["actual_weather_raw"] = raw
        time.sleep(WEATHER_API_INTERVAL)


def detect_arduino_port():
    """Auto-detect Arduino port from available COM ports"""
    print("\nScanning for Arduino...")
    ports = serial.tools.list_ports.comports()
    
    if not ports:
        print("✗ No COM ports detected")
        return None
    
    print(f"Found {len(ports)} port(s):")
    for port in ports:
        print(f"  • {port.device}: {port.description}")
        # Look for CH340 (USB-SERIAL) or Arduino board
        if 'CH340' in port.description or 'Arduino' in port.description or 'USB' in port.description:
            print(f"✓ Arduino detected on {port.device}")
            return port.device
    
    # If no obvious Arduino found, try first port
    if ports:
        print(f"⚠ Using first available port: {ports[0].device}")
        return ports[0].device
    
    return None

# Data structure for IoT Monitoring
data_lock = threading.Lock()
sensor_data = {
    "temperature": None,
    "humidity": None,
    "precipitation": None,
    "uv_index": None,
    "pressure": None,
    "prediction": "Waiting for Arduino",
    "forecast_2hr": "N/A",
    "confidence": 0,
    "model_agreement": 0,
    "status": "Waiting for Arduino",
    "timestamp": "---",
    "arduino_warning": None,  # Non-None string = show warning banner in UI
    "actual_weather":     None,  # Live ground truth from WeatherAPI
    "actual_weather_raw": None,  # Raw condition string from WeatherAPI
    "best_model":         "--",  # Model with highest cumulative match score
    "model_scores": {"decision_tree": 0, "gradient_boosting": 0, "knn": 0, "random_forest": 0},
    "models": {
        "decision_tree":     {"current": "Waiting for Arduino", "forecast": "N/A", "accuracy": "--"},
        "gradient_boosting": {"current": "Waiting for Arduino", "forecast": "N/A", "accuracy": "--"},
        "knn":               {"current": "Waiting for Arduino", "forecast": "N/A", "accuracy": "--"},
        "random_forest":     {"current": "Waiting for Arduino", "forecast": "N/A", "accuracy": "--"},
    },
    "simulation_mode": False,
    "monitoring": {
        "active": False,
        "session_id": None,
        "start_time": None,
        "duration": 0,
        "elapsed": 0,
        "remaining": 0
    }
}
history = collections.deque(maxlen=50)

# Pre-populate accuracy values from training results (visible before Arduino connects)
for _k in ("decision_tree", "gradient_boosting", "knn", "random_forest"):
    _pct = model_accuracies.get(_k, {}).get("current_accuracy_pct", "--")
    sensor_data["models"][_k]["accuracy"] = _pct

def get_monthly_log_filename():
    """Generate monthly log filename: weather_log_YYYY_MM.csv"""
    now = datetime.now()
    # ensure data/logs exists
    logs_dir = os.path.join(os.path.dirname(__file__), 'data', 'logs')
    os.makedirs(logs_dir, exist_ok=True)
    return os.path.join(logs_dir, f"weather_log_{now.year}_{now.month:02d}.csv")

def log_data(data):
    """Log data to monthly CSV file"""
    log_file = get_monthly_log_filename()
    file_exists = os.path.isfile(log_file)
    # ensure parent dir exists (get_monthly_log_filename already creates it, but be safe)
    os.makedirs(os.path.dirname(log_file), exist_ok=True)

    with open(log_file, mode='a', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=[
            "timestamp", "temperature", "humidity", "precipitation", 
            "uv_index", "pressure", "current_weather"
        ])
        if not file_exists:
            writer.writeheader()
        writer.writerow(data)

def apply_moving_average_filter(new_values):
    """Apply moving average filter to reduce sensor noise
    
    Args:
        new_values: dict with temperature, humidity, precipitation, uv_index, pressure
    
    Returns:
        dict with smoothed sensor values
    """
    sensor_history.append(new_values)
    
    if len(sensor_history) == 0:
        return new_values
    
    # Calculate moving average
    smoothed = {}
    for key in new_values.keys():
        values = [reading[key] for reading in sensor_history]
        # Use simple moving average
        smoothed[key] = np.mean(values)
    
    return smoothed

def apply_prediction_voting(prediction, history_deque):
    """Apply majority voting on predictions to avoid flickering
    
    Args:
        prediction: new prediction
        history_deque: deque of previous predictions
    
    Returns:
        majority voted prediction
    """
    history_deque.append(prediction)
    
    if len(history_deque) == 0:
        return prediction
    
    # Find most common prediction
    from collections import Counter
    prediction_counts = Counter(history_deque)
    most_common = prediction_counts.most_common(1)[0][0]
    
    return most_common

def read_serial():
    """Background thread — reads live data from the Arduino only.

    All sensor values remain None until a valid Arduino packet is received.
    There is no simulation or fake-data fallback.
    """
    global sensor_data, ARDUINO_PORT
    serial_port = None

    while True:
        try:
            if not sensor_data["monitoring"]["active"]:
                time.sleep(1)
                continue

            # ── Require a port ──────────────────────────────────────────────
            if not ARDUINO_PORT:
                with data_lock:
                    sensor_data["status"] = "Waiting for port — enter Arduino port in Engine Controls"
                    sensor_data["arduino_warning"] = (
                        "Arduino port not specified. Enter the port (e.g. COM7) and press START."
                    )
                time.sleep(2)
                continue

            # ── Open serial connection ──────────────────────────────────────
            if serial_port is None:
                try:
                    serial_port = serial.Serial(ARDUINO_PORT, ARDUINO_BAUD, timeout=5)
                    print(f"✓ Arduino connected on {ARDUINO_PORT} @ {ARDUINO_BAUD} baud")
                    with data_lock:
                        sensor_data["status"] = f"Connected — Reading Arduino on {ARDUINO_PORT}"
                        sensor_data["arduino_warning"] = None
                    time.sleep(2)
                except serial.SerialException as e:
                    print(f"✗ Cannot open {ARDUINO_PORT}: {e}")
                    with data_lock:
                        sensor_data["status"] = f"Cannot connect to {ARDUINO_PORT}"
                        sensor_data["arduino_warning"] = (
                            f"Cannot open {ARDUINO_PORT}. "
                            f"Check the port name, ensure the USB cable is plugged in, "
                            f"and that no other program (e.g. Arduino IDE Serial Monitor) is using it."
                        )
                    time.sleep(5)
                    continue

            # ── Read a line from Arduino ────────────────────────────────────
            if serial_port and serial_port.is_open:
                try:
                    if serial_port.in_waiting > 0:
                        line = serial_port.readline().decode('utf-8').strip()
                        if line:
                            values = line.split(',')
                            if len(values) == 5:
                                try:
                                    t, h, p, uv, pres = map(float, values)
                                    print(f"📡 T={t} H={h} P={p} UV={uv} Pres={pres}")
                                    if not validate_sensor_input(t, h, p, uv, pres):
                                        print("  ↳ Out-of-range — skipping.")
                                    else:
                                        with data_lock:
                                            update_values(t, h, p, uv, pres)
                                            if sensor_data["monitoring"]["active"]:
                                                log_data({
                                                    "timestamp": datetime.now().isoformat(),
                                                    "temperature": sensor_data["temperature"],
                                                    "humidity": sensor_data["humidity"],
                                                    "precipitation": sensor_data["precipitation"],
                                                    "uv_index": sensor_data["uv_index"],
                                                    "pressure": sensor_data["pressure"],
                                                    "current_weather": sensor_data["prediction"]
                                                })
                                        total_elapsed = int(time.time() - sensor_data["monitoring"]["start_time"])
                                        sensor_data["monitoring"]["elapsed"] = total_elapsed
                                        sensor_data["monitoring"]["remaining"] = max(
                                            0,
                                            (sensor_data["monitoring"]["duration"] * 60) - total_elapsed
                                        )
                                        if total_elapsed >= sensor_data["monitoring"]["duration"] * 60:
                                            sensor_data["monitoring"]["active"] = False
                                            sensor_data["status"] = "Completed"
                                except ValueError as e:
                                    print(f"⚠ Parse error: {e} | line: {line}")
                            else:
                                print(f"⚠ Expected 5 values, got {len(values)}: {line}")
                        else:
                            time.sleep(0.2)
                except (UnicodeDecodeError, ValueError) as e:
                    print(f"⚠ Decode error: {type(e).__name__}")
                except Exception as e:
                    print(f"⚠ Read error: {type(e).__name__} — {e}")

        except serial.SerialException as e:
            # Connection lost — clear data, set warning, keep ARDUINO_PORT so
            # the thread can attempt to reconnect on the next iteration.
            print(f"Serial disconnected: {type(e).__name__} - {e}")
            if serial_port:
                try:
                    serial_port.close()
                except Exception:
                    pass
            serial_port = None
            with data_lock:
                for k in ["temperature","humidity","precipitation","uv_index","pressure","prediction","forecast_2hr","confidence"]:
                    sensor_data[k] = None
                sensor_data["status"] = f"Arduino disconnected from {ARDUINO_PORT}"
                sensor_data["arduino_warning"] = (
                    f"Arduino disconnected from {ARDUINO_PORT}. "
                    f"Check the USB cable and ensure it is still plugged in."
                )
            time.sleep(5)
        except Exception as e:
            print(f"Error: {type(e).__name__} - {e}")
            time.sleep(5)

def validate_sensor_input(t, h, p, uv, pres):
    """Validate sensor input ranges.

    Returns True if all values are within acceptable ranges, otherwise False.
    """
    warnings = []
    # New validated ranges per request
    if not (-40 <= t <= 60):
        warnings.append(f"Temperature {t}°C outside range (-40-60°C)")
    if not (0 <= h <= 100):
        warnings.append(f"Humidity {h}% outside range (0-100%)")
    if not (0 <= p <= 100):
        warnings.append(f"Precipitation {p}% outside range (0-100%)")
    if not (0 <= uv <= 16):
        warnings.append(f"UV Index {uv} outside range (0-16)")
    if not (850 <= pres <= 1100):
        warnings.append(f"Pressure {pres} hPa outside range (850-1100)")

    if warnings:
        print(f"⚠️  Warning: {', '.join(warnings)}")
        return False
    return True

def _predict_one(clf, enc, X_scaled):
    """Run one model, return (label_str, confidence_pct_str).

    Works for models with or without predict_proba.
    Returns ('N/A', '--') if the model is None or raises any exception.
    NaN/Inf values in X_scaled are replaced with 0 before prediction so that
    all models (including LogisticRegression which rejects NaN natively) can
    always produce a result.
    """
    if clf is None or enc is None:
        return "N/A", "--"
    try:
        import numpy as _np
        X_safe = _np.nan_to_num(X_scaled, nan=0.0, posinf=0.0, neginf=0.0)
        pred  = clf.predict(X_safe)
        label = enc.inverse_transform(pred)[0]
        if hasattr(clf, "predict_proba"):
            conf = f"{max(clf.predict_proba(X_safe)[0]) * 100:.1f}%"
        else:
            conf = "N/A"
        return label, conf
    except Exception as _e:
        print(f"  [_predict_one] {type(clf).__name__}: {_e}")
        return "Error", "--"


def _ensemble_predict(clfs_with_weights, encoder, X_scaled):
    """Weighted soft-voting ensemble across multiple classifiers.

    Args:
        clfs_with_weights: list of (key, clf, accuracy_weight) tuples
        encoder: shared LabelEncoder for decoding class indices
        X_scaled: pre-scaled feature array (1 x n_features)

    Returns:
        (label, confidence_pct, agreement_pct)
        - label: final ensemble prediction string
        - confidence_pct: float, max probability in weighted avg (0–100)
        - agreement_pct: float, % of valid models agreeing with the ensemble label (0–100)
    """
    import numpy as _np
    n_classes = len(encoder.classes_)
    weighted_proba = _np.zeros(n_classes, dtype=float)
    total_weight = 0.0
    per_model_labels = []

    X_safe = _np.nan_to_num(X_scaled, nan=0.0, posinf=0.0, neginf=0.0)

    for key, clf, weight in clfs_with_weights:
        if clf is None or weight <= 0:
            continue
        try:
            if hasattr(clf, "predict_proba"):
                proba = clf.predict_proba(X_safe)[0]
                # Align to n_classes in case a model was trained on a subset
                if len(proba) == n_classes:
                    weighted_proba += weight * proba
                    total_weight += weight
                    per_model_labels.append(encoder.classes_[int(_np.argmax(proba))])
            else:
                # Fallback: one-hot from hard prediction
                pred_idx = int(clf.predict(X_safe)[0])
                proba = _np.zeros(n_classes)
                if pred_idx < n_classes:
                    proba[pred_idx] = 1.0
                weighted_proba += weight * proba
                total_weight += weight
                per_model_labels.append(encoder.classes_[pred_idx])
        except Exception as _e:
            print(f"  [ensemble] {key}: {type(_e).__name__} - {_e}")

    if total_weight == 0:
        return "N/A", 0.0, 0.0

    avg_proba = weighted_proba / total_weight
    final_idx = int(_np.argmax(avg_proba))
    final_label = encoder.classes_[final_idx]
    confidence = round(float(avg_proba[final_idx]) * 100, 1)

    agreeing = sum(1 for lbl in per_model_labels if lbl == final_label)
    agreement = round((agreeing / len(per_model_labels)) * 100, 1) if per_model_labels else 0.0

    return final_label, confidence, agreement


def update_values(t, h, p, uv, pres):
    """Update sensor values with noise filtering and prediction
    
    Applies moving average filter to reduce sensor noise, then updates
    predictions using both raw and smoothed sensor values.
    """
    global sensor_data, prediction_history, forecast_history
    
    # Validate input ranges
    validate_sensor_input(t, h, p, uv, pres)
    
    # Apply moving average filter to reduce sensor noise
    raw_values = {
        "temperature": t,
        "humidity": h,
        "precipitation": p,
        "uv_index": uv,
        "pressure": pres
    }
    smoothed_values = apply_moving_average_filter(raw_values)
    
    # Use smoothed values for display
    sensor_data["temperature"] = round(smoothed_values["temperature"], 2)
    sensor_data["humidity"] = round(smoothed_values["humidity"], 2)
    sensor_data["precipitation"] = round(smoothed_values["precipitation"], 2)
    sensor_data["uv_index"] = round(smoothed_values["uv_index"], 2)
    sensor_data["pressure"] = round(smoothed_values["pressure"], 2)
    sensor_data["timestamp"] = datetime.now().strftime("%H:%M:%S")
    
    # Get current time features
    now = datetime.now()
    hour_of_day = now.hour
    day_of_week = now.weekday()
    month = now.month
    
    # ── Build feature DataFrame (shared by current + forecast) ──────────────
    _feat_cols = ["Temperature", "Humidity", "Precipitation (%)", "UV Index",
                  "Pressure", "hour_of_day", "day_of_week", "month"]
    _feat_vals = [[
        smoothed_values["temperature"],
        smoothed_values["humidity"],
        smoothed_values["precipitation"],
        smoothed_values["uv_index"],
        smoothed_values["pressure"],
        hour_of_day, day_of_week, month
    ]]
    print(f"[FEAT] T={smoothed_values['temperature']:.2f} H={smoothed_values['humidity']:.2f} "
          f"P={smoothed_values['precipitation']:.2f} UV={smoothed_values['uv_index']:.2f} "
          f"Pres={smoothed_values['pressure']:.2f} hr={hour_of_day} dow={day_of_week} mo={month}")

    # ── Current Weather — Weighted Soft-Voting Ensemble ──────────────────────
    if scaler and label_encoder:
        try:
            current_input  = pd.DataFrame(_feat_vals, columns=_feat_cols)
            current_scaled = scaler.transform(current_input)

            # Weights = training accuracy from model_accuracies.json
            _c_ensemble = [
                ("decision_tree",     dt_current_model,  model_accuracies.get("decision_tree",     {}).get("current_accuracy", 0.97)),
                ("gradient_boosting", gb_current_model,  model_accuracies.get("gradient_boosting", {}).get("current_accuracy", 0.99)),
                ("knn",               knn_current_model, model_accuracies.get("knn",               {}).get("current_accuracy", 0.97)),
                ("random_forest",     model,             model_accuracies.get("random_forest",     {}).get("current_accuracy", 0.99)),
            ]
            raw_prediction, confidence, agreement = _ensemble_predict(_c_ensemble, label_encoder, current_scaled)
            stabilized_prediction = apply_prediction_voting(raw_prediction, prediction_history)
            sensor_data["prediction"]     = stabilized_prediction
            sensor_data["confidence"]     = confidence
            sensor_data["model_agreement"] = agreement
            print(f"✅ Ensemble Current: {stabilized_prediction} (conf={confidence:.1f}% agree={agreement:.1f}%)")
        except Exception as e:
            print(f"⚠️  Ensemble prediction error: {type(e).__name__} - {e}")
            sensor_data["prediction"]     = "Unknown"
            sensor_data["confidence"]     = 0
            sensor_data["model_agreement"] = 0
    else:
        sensor_data["prediction"]     = "Model not loaded"
        sensor_data["confidence"]     = 0
        sensor_data["model_agreement"] = 0

    # ── 2-Hour Forecast — Weighted Soft-Voting Ensemble ──────────────────────
    if forecast_scaler and forecast_encoder:
        try:
            forecast_input  = pd.DataFrame(_feat_vals, columns=_feat_cols)
            forecast_scaled = forecast_scaler.transform(forecast_input)

            _f_ensemble = [
                ("decision_tree",     dt_forecast_model,  model_accuracies.get("decision_tree",     {}).get("forecast_accuracy", 0.52)),
                ("gradient_boosting", gb_forecast_model,  model_accuracies.get("gradient_boosting", {}).get("forecast_accuracy", 0.58)),
                ("knn",               knn_forecast_model, model_accuracies.get("knn",               {}).get("forecast_accuracy", 0.53)),
                ("random_forest",     forecast_model,     model_accuracies.get("random_forest",     {}).get("forecast_accuracy", 0.60)),
            ]
            raw_forecast, _, _ = _ensemble_predict(_f_ensemble, forecast_encoder, forecast_scaled)
            stabilized_forecast = apply_prediction_voting(raw_forecast, forecast_history)
            sensor_data["forecast_2hr"] = stabilized_forecast
            print(f"✅ Ensemble Forecast: {stabilized_forecast}")
        except Exception as e:
            print(f"⚠️  Ensemble forecast error: {type(e).__name__} - {e}")
            sensor_data["forecast_2hr"] = "N/A"
    else:
        sensor_data["forecast_2hr"] = "Model not loaded"
    
    # ── Multi-model comparison predictions (per-model display panel) ────────
    # Reuses _feat_cols/_feat_vals already built above.
    if scaler and label_encoder and forecast_encoder:
        try:
            _c_input  = pd.DataFrame(_feat_vals, columns=_feat_cols)
            _c_scaled = scaler.transform(_c_input)
            _f_scaled = forecast_scaler.transform(_c_input) if forecast_scaler else _c_scaled

            _multi = [
                ("decision_tree",     dt_current_model,  dt_forecast_model),
                ("gradient_boosting", gb_current_model,  gb_forecast_model),
                ("knn",               knn_current_model, knn_forecast_model),
                ("random_forest",     model,             forecast_model),
            ]
            for _key, _c_clf, _f_clf in _multi:
                _c_label, _ = _predict_one(_c_clf, label_encoder,   _c_scaled)
                _f_label, _ = _predict_one(_f_clf, forecast_encoder, _f_scaled)
                _acc = model_accuracies.get(_key, {}).get("current_accuracy_pct", "--")
                sensor_data["models"][_key] = {
                    "current":  _c_label,
                    "forecast": _f_label,
                    "accuracy": _acc,
                }
        except Exception as _me:
            print(f"⚠️  Multi-model error: {type(_me).__name__} - {_me}")

    # ── Rolling-window score each model against live WeatherAPI ground truth ──
    actual = sensor_data.get("actual_weather")
    if actual:
        for _key in ("decision_tree", "gradient_boosting", "knn", "random_forest"):
            _pred = sensor_data["models"].get(_key, {}).get("current")
            if _pred and _pred not in ("N/A", "Error", "Waiting for Arduino", None):
                _hit = 1 if _pred == actual else 0
                _model_score_history[_key].append(_hit)
                # Rolling score = sum of last N hits
                sensor_data["model_scores"][_key] = int(sum(_model_score_history[_key]))
        # Best model = highest rolling hit rate (ties broken by training accuracy)
        def _rolling_rate(k):
            hist = _model_score_history[k]
            if not hist:
                return 0.0
            return sum(hist) / len(hist)
        _best_key = max(
            ("decision_tree", "gradient_boosting", "knn", "random_forest"),
            key=lambda k: (_rolling_rate(k), model_accuracies.get(k, {}).get("current_accuracy", 0))
        )
        sensor_data["best_model"] = _MODEL_LABELS.get(_best_key, _best_key)

    history.append({
        "temperature": sensor_data["temperature"], 
        "humidity": sensor_data["humidity"], 
        "precipitation": sensor_data["precipitation"], 
        "uv_index": sensor_data["uv_index"], 
        "pressure": sensor_data["pressure"],
        "timestamp": sensor_data["timestamp"]
    })

# ── Simulation mode ──────────────────────────────────────────────────────────
import random as _random

_SIM_CONDITIONS = {
    # weather_label → (t_lo, t_hi, h_lo, h_hi, precip_lo, precip_hi, uv_lo, uv_hi, pres_lo, pres_hi)
    # Ranges are aligned with the training dataset to avoid distribution shift.
    # Precipitation:  Sunny 0-22%, Cloudy 8-50%, Rainy 40-100%
    # UV (daytime):   Sunny 5-12,  Cloudy 1.5-5, Rainy 0-1.5
    'Sunny':  (28, 37,  12, 50,  0, 18,  6, 11, 1012, 1028),
    'Cloudy': (16, 25,  44, 78, 10, 45,  2,  5,  999, 1018),
    'Rainy':  (10, 19,  70, 97, 45, 95,  0,  1,  977, 1008),
}
_SIM_CYCLE = ['Sunny', 'Cloudy', 'Rainy']   # fallback cycling order
_sim_condition_idx = 0
_sim_step         = 0   # counts readings; condition rotates every 20

def _simulate_reading():
    """Generate a plausible sensor reading.

    Priority:
      1. Use the live WeatherAPI condition (sensor_data["actual_weather"]) so that
         simulated sensor values reflect real current weather — making model
         predictions directly comparable against the WeatherAPI ground truth.
      2. Fall back to cycling through Sunny → Cloudy → Rainy when no API data
         is available yet (e.g. on first startup before the API responds).
    """
    global _sim_condition_idx, _sim_step
    actual = sensor_data.get("actual_weather")
    if actual and actual in _SIM_CONDITIONS:
        params = _SIM_CONDITIONS[actual]
    else:
        _sim_step += 1
        if _sim_step % 20 == 0:
            _sim_condition_idx = (_sim_condition_idx + 1) % len(_SIM_CYCLE)
        params = _SIM_CONDITIONS[_SIM_CYCLE[_sim_condition_idx]]
    t1, t2, h1, h2, p1, p2, uv1, uv2, pr1, pr2 = params
    t   = round(_random.uniform(t1, t2)   + _random.gauss(0, 0.5), 2)
    h   = round(_random.uniform(h1, h2)   + _random.gauss(0, 1),   2)
    p   = round(_random.uniform(p1, p2)   + _random.gauss(0, 1),   2)
    uv  = round(_random.uniform(uv1, uv2) + _random.gauss(0, 0.2), 2)
    pr  = round(_random.uniform(pr1, pr2) + _random.gauss(0, 0.5), 2)
    return t, h, p, uv, pr

def _run_simulation():
    """Background thread that generates fake sensor data when SIMULATION_MODE is True."""
    while True:
        if not SIMULATION_MODE:
            time.sleep(0.5)
            continue
        if not sensor_data["monitoring"]["active"]:
            time.sleep(0.5)
            continue
        t, h, p, uv, pres = _simulate_reading()
        with data_lock:
            update_values(t, h, p, uv, pres)
            if sensor_data["monitoring"]["active"]:
                log_data({
                    "timestamp":       datetime.now().isoformat(),
                    "temperature":     sensor_data["temperature"],
                    "humidity":        sensor_data["humidity"],
                    "precipitation":   sensor_data["precipitation"],
                    "uv_index":        sensor_data["uv_index"],
                    "pressure":        sensor_data["pressure"],
                    "current_weather": sensor_data["prediction"]
                })
            total_elapsed = int(time.time() - (sensor_data["monitoring"].get("start_time") or time.time()))
            sensor_data["monitoring"]["elapsed"]   = total_elapsed
            sensor_data["monitoring"]["remaining"] = max(
                0, (sensor_data["monitoring"]["duration"] * 60) - total_elapsed
            )
            if total_elapsed >= sensor_data["monitoring"]["duration"] * 60:
                sensor_data["monitoring"]["active"] = False
                sensor_data["status"] = "Completed"
        time.sleep(2)

# Start the simulation thread (always running, activated by flag)
_sim_thread = threading.Thread(target=_run_simulation, daemon=True)
_sim_thread.start()

# we start the serial reader lazily when a monitoring session begins
thread = None
thread_lock = threading.Lock()

@app.route('/')
def index(): return render_template('index.html')

@app.route('/pressure')
def pressure(): return render_template('pressure.html')


def _resolve_port(raw: str) -> str:
    """Convert a user-supplied port value to a full device path.

    Accepts:
      - A plain integer or numeric string (e.g. "0" → "/dev/ttyUSB0")
      - A full Linux path already (e.g. "/dev/ttyACM0")
      - A Windows-style COM port (e.g. "COM3")
    """
    raw = raw.strip()
    if raw.lstrip('-').isdigit():
        return f"/dev/ttyUSB{raw}"
    return raw


@app.route('/start_monitoring', methods=['POST'])
def start_monitoring():
    """Called from the UI start button.  Enables monitoring and ensures
    the serial reader thread is active.  The user must supply the Arduino
    port number; if the port cannot be opened, a warning is shown on the
    dashboard without crashing the app.
    """
    global ARDUINO_PORT
    from flask import request
    payload = request.json
    duration = int(payload.get('duration', 5))
    raw_port = str(payload.get('port', '')).strip()

    resolved_port = _resolve_port(raw_port) if raw_port else None

    with data_lock:
        ARDUINO_PORT = resolved_port
        sensor_data["monitoring"] = {
            "active": True,
            "session_id": f"SESS-{int(time.time())}",
            "start_time": time.time(),
            "duration": duration,
            "elapsed": 0,
            "remaining": duration * 60
        }
        history.clear()
        # Reset rolling score window so each new session starts fresh
        for _k in _model_score_history:
            _model_score_history[_k].clear()
        sensor_data["model_scores"] = {"decision_tree": 0, "gradient_boosting": 0, "knn": 0, "random_forest": 0}
        sensor_data["best_model"] = "--"
        if SIMULATION_MODE:
            actual = sensor_data.get("actual_weather")
            if actual:
                sensor_data["status"] = f"Simulation Running · WeatherAPI: {actual}"
            else:
                sensor_data["status"] = "Simulation Running · Awaiting WeatherAPI"
            sensor_data["arduino_warning"] = None
        elif not resolved_port:
            sensor_data["status"] = "No port specified — enter a port number"
            sensor_data["arduino_warning"] = "Please enter the Arduino port number before starting."
        else:
            sensor_data["status"] = f"Connecting to Arduino on {resolved_port}…"
            sensor_data["arduino_warning"] = None
    # launch real serial reader thread only when not simulating
    global thread
    if not SIMULATION_MODE:
        with thread_lock:
            if thread is None or not thread.is_alive():
                thread = threading.Thread(target=read_serial, daemon=True)
                thread.start()
    return jsonify({"status": "started"})

@app.route('/stop_monitoring', methods=['POST'])
def stop_monitoring():
    with data_lock:
        sensor_data["monitoring"]["active"] = False
        sensor_data["status"] = "Completed"
    return jsonify({"status": "stopped"})

@app.route('/set_mode', methods=['POST'])
def set_mode():
    """Switch between 'real' (Arduino) and 'simulation' mode."""
    global SIMULATION_MODE
    from flask import request as _req
    mode = _req.json.get('mode', 'real')
    SIMULATION_MODE = (mode == 'simulation')
    with data_lock:
        sensor_data["simulation_mode"] = SIMULATION_MODE
        if SIMULATION_MODE:
            actual = sensor_data.get("actual_weather")
            sensor_data["status"] = (f"Simulation Running · WeatherAPI: {actual}"
                                     if actual else "Simulation Running · Awaiting WeatherAPI")
            sensor_data["arduino_warning"] = None
        else:
            sensor_data["status"] = "Waiting for Arduino"
    return jsonify({"status": "ok", "mode": mode})

@app.route('/clear_data', methods=['POST'])
def clear_data():
    with data_lock:
        history.clear()
        sensor_data["status"] = "Idle"
        sensor_data["monitoring"]["active"] = False
    return jsonify({"status": "cleared"})

@app.route('/temp_humidity')
def temp_humidity(): return render_template('temp_humidity.html')

@app.route('/precipitation')
def precipitation(): return render_template('precipitation.html')

@app.route('/uv_index')
def uv_index(): return render_template('uv_index.html')

@app.route('/prediction')
def prediction(): return render_template('prediction.html')

@app.route('/model_analysis')
def model_analysis():
    with data_lock:
        models_snapshot = {k: dict(v) for k, v in sensor_data.get("models", {}).items()}
        scores_snapshot = dict(sensor_data.get("model_scores", {}))
        actual = sensor_data.get("actual_weather")
    return render_template(
        'model_analysis.html',
        models=models_snapshot,
        scores=scores_snapshot,
        actual=actual,
        accuracies=model_accuracies
    )

def _compute_best_model_info():
    """Return best_model dict: {name, key, accuracy, match, reason}.

    Best = model that matches actual_weather AND has highest training accuracy.
    Fallback: model with most cumulative score points.
    """
    actual      = sensor_data.get("actual_weather")
    models_data = sensor_data.get("models", {})
    scores      = sensor_data.get("model_scores", {})

    def _acc_float(key):
        a = models_data.get(key, {}).get("accuracy", "--")
        if isinstance(a, str):
            a = a.replace("%", "").strip()
        try:
            return float(a)
        except (ValueError, TypeError):
            return 0.0

    keys = ("decision_tree", "gradient_boosting", "knn", "random_forest")

    # Models that currently match the live weather
    matches = [k for k in keys
               if actual and models_data.get(k, {}).get("current") == actual]

    if matches:
        best_key = max(matches, key=_acc_float)
        reason   = "Matched Real Weather + High Accuracy"
    elif any(v > 0 for v in scores.values()):
        best_key = max(scores, key=scores.get)
        reason   = "Highest Cumulative Score"
    else:
        return {"name": "--", "key": "--", "accuracy": "--", "match": False, "reason": "--"}

    pred  = models_data.get(best_key, {}).get("current")
    match = bool(actual and pred == actual)
    return {
        "name":     _MODEL_LABELS.get(best_key, best_key),
        "key":      best_key,
        "accuracy": models_data.get(best_key, {}).get("accuracy", "--"),
        "match":    match,
        "reason":   reason,
    }


@app.route('/data')
def get_data():
    with data_lock:
        return jsonify({
            "current":    sensor_data,
            "history":    list(history),
            "models":     sensor_data.get("models", {}),
            "best_model": _compute_best_model_info(),
        })

@app.route('/model_info')
def model_info():
    """Return real model architecture details and feature importances."""
    FEATURE_NAMES = [
        "Temperature", "Humidity", "Precipitation (%)",
        "UV Index", "Pressure",
        "hour_of_day", "day_of_week", "month"
    ]

    def extract_info(m, enc):
        if m is None:
            return None
        info = {
            "type": type(m).__name__,
            "n_estimators": int(getattr(m, "n_estimators", 0)),
            "max_depth": getattr(m, "max_depth", None),
            "n_features": int(getattr(m, "n_features_in_", len(FEATURE_NAMES))),
            "classes": list(enc.classes_) if enc is not None and hasattr(enc, "classes_") else [],
            "feature_importances": []
        }
        if hasattr(m, "feature_importances_"):
            imps = m.feature_importances_
            total = float(imps.sum()) or 1.0
            info["feature_importances"] = [
                {
                    "name": FEATURE_NAMES[i] if i < len(FEATURE_NAMES) else f"f{i}",
                    "value": round(float(v / total) * 100, 1)
                }
                for i, v in enumerate(imps)
            ]
            # Sort descending by importance
            info["feature_importances"].sort(key=lambda x: x["value"], reverse=True)
        return info

    return jsonify({
        "current_model":  extract_info(model, label_encoder),
        "forecast_model": extract_info(forecast_model, forecast_encoder)
    })

# Start WeatherAPI background thread (fetches live ground truth every 5 min)
threading.Thread(target=_weather_api_loop, daemon=True).start()

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
