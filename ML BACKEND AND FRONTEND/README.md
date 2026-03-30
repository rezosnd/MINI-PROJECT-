# IoT + Machine Learning Weather Prediction System

A real-time weather monitoring and forecasting system that reads sensor data from Arduino microcontrollers, processes it with advanced machine learning models, and provides both current weather classification and 2-hour ahead weather forecasts.

---

## 📋 Table of Contents

1. [Project Overview](#project-overview)
2. [System Architecture](#system-architecture)
3. [Hardware Requirements](#hardware-requirements)
4. [Sensor Data Flow](#sensor-data-flow)
5. [Machine Learning Models](#machine-learning-models)
6. [Key Features](#key-features)
7. [Installation & Setup](#installation--setup)
8. [Configuration](#configuration)
9. [Usage Guide](#usage-guide)
10. [Arduino Integration](#arduino-integration)
11. [Data Logging](#data-logging)
12. [Advanced Features](#advanced-features)
13. [Troubleshooting](#troubleshooting)

---

## 🎯 Project Overview

This system combines Arduino hardware sensors with advanced machine learning to:
- **Monitor** real-time weather conditions from 5 sensor inputs
- **Classify** current weather (Sunny, Cloudy, Rainy, etc.)
- **Forecast** weather conditions 2 hours ahead
- **Visualize** data through an interactive Flask web dashboard
- **Log** historical data organized by month for analysis

**Key Innovation**: Uses atmospheric pressure in conjunction with temperature, humidity, precipitation, and UV index for improved prediction accuracy.

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Arduino Hardware                        │
│  ┌──────────────┬──────────────┬──────────────────────┐     │
│  │ Temperature  │   Humidity   │   UV Index Sensor    │     │
│  │   Sensor     │   Sensor     │   Pressure Sensor    │     │
│  │              │              │   Precipitation      │     │
│  └──────────────┴──────────────┴──────────────────────┘     │
└──────────────────────┬──────────────────────────────────────┘
                       │ Serial (9600 baud)
                       │ Format: "temp,humidity,precip,uv,pressure"
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              Python IoT Application (app.py)                 │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ 1. Serial Reader (Background Thread)                 │   │
│  │    - Detects Arduino on COM ports                    │   │
│  │    - Reads 5 sensor values                           │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ 2. Data Processing Pipeline                          │   │
│  │    - Input validation (range checks)                 │   │
│  │    - Noise filtering (moving average smoothing)      │   │
│  │    - Time feature extraction (hour, day, month)      │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ 3. ML Prediction Engine                              │   │
│  │    - Current weather prediction (RandomForest)       │   │
│  │    - 2-hour forecast (RandomForest)                  │   │
│  │    - Prediction stabilization (majority voting)      │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ 4. Data Logging                                      │   │
│  │    - Monthly CSV files (weather_log_YYYY_MM.csv)     │   │
│  │    - Timestamp, sensor values, predictions           │   │
│  └──────────────────────────────────────────────────────┘   │
└──────────────────────────────┬───────────────────────────────┘
                               │ HTTP (Port 5000)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│            Flask Web Dashboard (Visualization)               │
│  ├── Current Metrics (temperature, humidity, etc.)          │
│  ├── Weather Predictions (current + 2h forecast)            │
│  ├── Historical Charts (temperature, precipitation trends)  │
│  ├── Sensor Status & Monitoring Controls                    │
│  └── Live Data Updates (WebSocket-like AJAX polling)        │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔧 Hardware Requirements

### Arduino Microcontroller
- **Board**: Arduino Uno, Nano, Mega, or compatible
- **USB Cable**: For serial communication with PC

### Environmental Sensors
| Sensor | Function | Range | Output Format |
|--------|----------|-------|---------------|
| Temperature | Ambient temperature measurement | -40°C to +50°C | Analog/Digital |
| Humidity | Relative humidity measurement | 0-100% | Analog/Digital |
| Pressure | Atmospheric pressure (barometer) | 950-1050 hPa | Analog/Digital |
| UV Index | UV radiation intensity | 0-16 | Analog/Digital |
| Precipitation | Rainfall detection/measurement | 0-100% | Analog/Digital |

### Wiring Notes
- Use analog inputs (A0-A4) for sensor connections
- Add pull-up resistors where needed
- Use voltage regulators for 3.3V sensors
- Include decoupling capacitors near power pins

---

## 📊 Sensor Data Flow

### Serial Communication Format
```
Arduino Format: "TEMP,HUMIDITY,PRECIPITATION,UV_INDEX,PRESSURE"
Example:        "23.5,65.2,10.0,3,1013.25"

Expected Ranges:
- Temperature:   15-50°C
- Humidity:      0-100%
- Precipitation: 0-100%
- UV Index:      0-16
- Pressure:      950-1050 hPa
```

### Arduino Code Example
```cpp
void setup() {
  Serial.begin(9600);
}

void loop() {
  float temp = analogRead(A0) * (50.0 / 1023.0);      // Temperature sensor
  float humidity = analogRead(A1) * (100.0 / 1023.0); // Humidity sensor
  float precip = analogRead(A2) * (100.0 / 1023.0);   // Precipitation sensor
  float uv = analogRead(A3) * (16.0 / 1023.0);        // UV Index sensor
  float pressure = analogRead(A4) * (100.0 / 1023.0) + 950; // Pressure sensor
  
  // Send data to Python
  Serial.print(temp);  Serial.print(",");
  Serial.print(humidity); Serial.print(",");
  Serial.print(precip); Serial.print(",");
  Serial.print(uv); Serial.print(",");
  Serial.println(pressure);
  
  delay(5000); // Read every 5 seconds
}
```

### Data Validation
All incoming sensor values are validated against safe ranges. Out-of-range values trigger warnings but don't crash the system.

---

## 🤖 Machine Learning Models

### Model Architecture

The system uses two separate **RandomForest** classification models with gradient boosting for decision-making accuracy.

#### 1. **Current Weather Prediction Model**
**Purpose**: Classify weather in real-time based on current conditions

**Input Features** (8 total):
- **Sensor Features** (5):
  - Temperature
  - Humidity
  - Precipitation (%)
  - Atmospheric Pressure
  - UV Index
- **Time Features** (3):
  - Hour of day (0-23)
  - Day of week (0-6, Monday=0)
  - Month (1-12)

**Model Details**:
- Algorithm: RandomForestClassifier
- Estimators: 100 trees
- Max Depth: 15 levels
- Training/Test Split: 80/20
- Scaling: StandardScaler (zero mean, unit variance)

**Output Classes** (Examples):
- Sunny
- Cloudy
- Rainy
- Snowy
- Stormy
- Partly Cloudy
- Foggy

#### 2. **2-Hour Weather Forecast Model**
**Purpose**: Predict weather conditions ~120 minutes in the future

**Input Features** (8 total):
- Same 5 sensor features as current model
- Same 3 time features as current model

**Model Details**:
- Algorithm: RandomForestClassifier
- Estimators: 100 trees
- Max Depth: 15 levels
- Training/Test Split: 80/20 on forecast dataset
- Scaling: StandardScaler

**Output**: Same weather classes as current model

### Model Training Pipeline

```
Raw Data (weather_classification_data.csv)
    ↓
Feature Selection (5 sensors only)
    ↓
Data Cleaning (duplicates, NaN removal)
    ↓
Time Feature Engineering
    ↓
Label Encoding (weather classes → numeric)
    ↓
Feature Scaling (StandardScaler)
    ↓
Train/Test Split (80/20)
    ↓
RandomForest Training
    ↓
Evaluation Metrics:
  - Accuracy (train/test)
  - Confusion Matrix
  - Classification Report (precision/recall/F1)
    ↓
Model Serialization (joblib .pkl files)
```

### Model Files Generated
After training, the following files are created:
- `weather_model.pkl` - Current weather predictor
- `label_encoder.pkl` - Encodes/decodes weather classes
- `weather_scaler.pkl` - Normalizes sensor values
- `forecast_model.pkl` - 2-hour forecast predictor
- `forecast_encoder.pkl` - Forecast class encoder
- `forecast_scaler.pkl` - Forecast feature scaler

### Model Inference Process

```
1. Read 5 Sensor Values (Arduino)
   ↓
2. Apply Noise Filter (Moving Average)
   ↓
3. Extract Time Features (current hour/day/month)
   ↓
4. Scale Features (using saved StandardScaler)
   ↓
5. Feed to Current Weather Model
   ↓
6. Get Prediction + Confidence Score
   ↓
7. Apply Majority Voting (last 3 predictions)
   ↓
8. Display Stabilized Prediction
```

---

## 🎨 Key Features

### 1. **Multi-Sensor Data Fusion**
Combines 5 different environmental sensors for robust prediction:
- Temperature (heat energy)
- Humidity (water vapor content)
- Precipitation (rainfall detection)
- UV Index (solar radiation)
- Atmospheric Pressure (barometric trend)

### 2. **Sensor Noise Filtering**
- **Moving Average Filter**: Smooths last 5 sensor readings
- Reduces noise from sensor jitter
- Configuration: `SMOOTHING_WINDOW = 5` in app.py

### 3. **Prediction Stabilization**
- **Majority Voting**: Uses last 3 predictions
- Prevents rapid prediction flickering
- More stable visualization in dashboard
- Configuration: `PREDICTION_VOTING_WINDOW = 3` in app.py

### 4. **Time-Based Features**
Incorporates temporal patterns:
- Hour of day (affects weather patterns)
- Day of week (weekly cycles)
- Month (seasonal variations)

### 5. **Dual Prediction Models**
- **Current weather**: Immediate classification
- **2-hour forecast**: Trend prediction

### 6. **Monthly Data Logging**
- Automatic CSV creation (weather_log_YYYY_MM.csv)
- Organized by month for annual analysis
- Contains: timestamp, all 5 sensors, current weather prediction

### 7. **Interactive Web Dashboard**
- Real-time sensor display
- Historical trend charts
- Start/stop monitoring controls
- Multiple visualization pages:
  - Temperature & Humidity trends
  - Precipitation timeline
  - UV Index variations
  - Atmospheric Pressure changes
  - Current weather & forecast

### 8. **Auto-Detection of Arduino**
- Automatically scans COM ports
- Detects CH340, Arduino, or USB devices
- Reconnects on disconnection
- Status messages for debugging

---

## 📦 Installation & Setup

### Prerequisites
- Python 3.11+
- Arduino with sensors (optional if using test data)
- Windows/Linux/macOS

### Step 1: Clone/Download Project
```bash
cd pokiieie
```

### Step 2: Create Virtual Environment (Optional but Recommended)
```bash
python -m venv venv
# Windows:
venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate
```

### Step 3: Install Dependencies
```bash
pip install -r requirements.txt
# Or manually:
pip install flask numpy pandas scikit-learn joblib pyserial
```

**Dependencies**:
- Flask 3.1.2+ - Web framework
- Pandas 3.0.0+ - Data manipulation
- NumPy 2.4.2+ - Numerical computing
- Scikit-learn 1.8.0+ - Machine learning
- Joblib 1.5.3+ - Model serialization
- PySerial 3.5+ - Arduino communication

### Step 4: Verify Installation
```bash
python -c "import flask, pandas, sklearn, joblib, serial; print('✓ All dependencies installed')"
```

---

## ⚙️ Configuration

### Arduino Port Configuration
Edit `app.py` or `live_predict.py` and update:
```python
ARDUINO_PORT = "COM7"    # Windows (or /dev/ttyUSB0 on Linux)
ARDUINO_BAUD = 9600      # Baud rate (must match Arduino)
```

### Flask Dashboard Configuration
Edit `app.py`:
```python
app.run(host='0.0.0.0', port=5000)  # Change port if needed
```

### Sensor Range Validation
Edit validation ranges in `validate_sensor_input()`:
```python
if not (15 <= t <= 50):           # Temperature range
if not (0 <= h <= 100):           # Humidity range
if not (950 <= pres <= 1050):     # Pressure range
```

### Noise Filter Window
Edit smoothing window size in `app.py`:
```python
SMOOTHING_WINDOW = 5              # Number of readings to average
```

### Prediction Voting Window
Edit majority voting window in `app.py`:
```python
PREDICTION_VOTING_WINDOW = 3      # Last N predictions to vote on
```

---

## 🚀 Usage Guide

### Phase 1: Train Models (First Time)

**Step 1: Prepare Training Data**
- Ensure `weather_classification_data.csv` exists (Kaggle dataset)
- Run data builder: `python build_forecast_dataset.py`

**Step 2: Train Current Weather Model**
```bash
python train_model.py
# Output:
# ✓ WEATHER CLASSIFICATION MODEL - COMPREHENSIVE EVALUATION
# ✓ Training Accuracy: 0.92XX
# ✓ Test Accuracy: 0.89XX
# ✓ weather_model.pkl saved
```

**Step 3: Train Forecast Model**
```bash
python train_forecast.py
# Output:
# ✓ WEATHER FORECAST MODEL - TRAINING PIPELINE
# ✓ Current Weather Model Accuracy: 0.92XX
# ✓ Forecast Model Accuracy: 0.88XX
# ✓ forecast_model.pkl saved
```

**Models are now trained and ready!**

### Phase 2: Run the Flask Dashboard

**Start the Flask Application**:
```bash
python app.py
# Output:
# * Running on http://0.0.0.0:5000
# ✓ Models and scalers loaded successfully
# ✓ Arduino will be detected when monitoring starts
```

**Open Dashboard**:
- Browser: http://localhost:5000
- Or remote: http://<your-ip>:5000

**Dashboard Features**:
- Start/Stop monitoring with duration slider
- View real-time sensor values
- See current weather prediction and confidence
- View 2-hour weather forecast
- Explore historical trend charts
- Clear collected data

### Phase 3: Collect Real Data (With Arduino)

**Connect Arduino**:
1. Upload sensor code to Arduino
2. Connect via USB to PC
3. Application auto-detects COM port

**Start Monitoring**:
1. Open dashboard (http://localhost:5000)
2. Enter monitoring duration (minutes)
3. Click "Start Monitoring"
4. Real-time data displayed + logged monthly

**Monitor Output**:
```
✓ Arduino connected on COM7 (9600 baud)
⚠️  Reading 5 values...
📊 Temperature: 23.5°C
   Humidity: 65.2%
   Pressure: 1013.25 hPa
   ...
🌤️  Current Weather: Cloudy (confidence: 87.3%)
```

### Phase 4: Retrain with Collected Data

**Build Forecast Dataset** (from logged data):
```bash
python build_forecast_dataset.py
# Uses weather_log_YYYY_MM.csv files
# Creates forecast_dataset.csv with targets
```

**Retrain Models** (with real data):
```bash
python train_forecast.py
# Uses new forecast_dataset.csv for training
```

---

## 🎮 Arduino Integration

### Arduino Code Template

```cpp
#include <Wire.h>
#include <Adafruit_Sensor.h>
#include <Adafruit_BMP280.h>        // Pressure/temp sensor
#include <Adafruit_DHT.h>           // Humidity/temp sensor

// Pin Definitions
#define DHTPIN 2
#define DHTTYPE DHT22
#define UV_PIN A0
#define RAIN_PIN A1
#define PRESSURE_I2C_ADDR 0x77

// Sensor Objects
DHT dht(DHTPIN, DHTTYPE);
Adafruit_BMP280 bmp280;

void setup() {
  Serial.begin(9600);
  dht.begin();
  bmp280.begin();
  delay(2000);  // Let sensors initialize
}

void loop() {
  // Read temperature & humidity
  float temperature = dht.readTemperature();
  float humidity = dht.readHumidity();
  
  // Read pressure
  float pressure = bmp280.readPressure() / 100.0;  // Convert to hPa
  
  // Read UV Index (analog 0-1023 → 0-16 scale)
  int uvRaw = analogRead(UV_PIN);
  float uvIndex = map(uvRaw, 0, 1023, 0, 16) / 10.0;
  
  // Read precipitation (analog 0-1023 → 0-100%)
  int rainRaw = analogRead(RAIN_PIN);
  float precipitation = map(rainRaw, 0, 1023, 0, 100);
  
  // Send to Python (format: temp,humidity,precip,uv,pressure)
  Serial.print(temperature);     Serial.print(",");
  Serial.print(humidity);        Serial.print(",");
  Serial.print(precipitation);   Serial.print(",");
  Serial.print(uvIndex);         Serial.print(",");
  Serial.println(pressure);
  
  // Read every 5 seconds
  delay(5000);
}
```

### Supported Arduino Sensors

| Sensor Type | Example Models | I2C/Serial | Notes |
|-------------|---|---|---|
| Temperature | DHT22, BMP280, DS18B20 | I2C/1-Wire | Use calibrated models |
| Humidity | DHT22, BME680 | DHT Protocol | ±3% accuracy recommended |
| Pressure | BMP280, BME680, MS5611 | I2C | Barometric sensor |
| UV Index | GUVA-S12SD | Analog | Requires photodiode |
| Precipitation | Tipping bucket | Analog | Count pulses for mm |

### Calibration Tips
1. **Temperature**: Compare against thermometer
2. **Humidity**: Use salt bowls at different RH% levels
3. **Pressure**: Cross-check with weather service
4. **UV Index**: Test in known sunlight conditions
5. **Precipitation**: Use measuring cup with rain simulator

---

## 📝 Data Logging

### Monthly Log Files
Automatically created with format: `weather_log_YYYY_MM.csv`

Example:
- `weather_log_2026_01.csv` (January 2026)
- `weather_log_2026_02.csv` (February 2026)
- `weather_log_2026_03.csv` (March 2026)

### CSV Structure
```csv
timestamp,temperature,humidity,precipitation,uv_index,pressure,current_weather
2026-03-04T14:30:45.123456,23.5,65.2,10.0,3.2,1013.25,Cloudy
2026-03-04T14:31:00.456789,23.6,65.1,9.8,3.2,1013.26,Cloudy
```

### Data Analysis Example
```python
import pandas as pd

# Load monthly logs
df_march = pd.read_csv("weather_log_2026_03.csv")
df_april = pd.read_csv("weather_log_2026_04.csv")

# Analyze temperature trends
avg_temp = df_march['temperature'].mean()
max_temp = df_march['temperature'].max()
min_temp = df_march['temperature'].min()

# Generate reports
print(f"March Average Temperature: {avg_temp:.1f}°C")
print(f"Temperature Range: {min_temp:.1f}°C - {max_temp:.1f}°C")
```

---

## 🔧 Advanced Features

### 1. Multi-Month Analysis
```python
import glob
import pandas as pd

# Load all monthly logs
files = glob.glob("weather_log_*.csv")
data = pd.concat([pd.read_csv(f) for f in files])

# Seasonal analysis
data['date'] = pd.to_datetime(data['timestamp'])
data['season'] = data['date'].dt.month % 12 // 3 + 1
seasonal_avg = data.groupby('season')['temperature'].mean()
```

### 2. Model Retraining Pipeline
```bash
# Automated workflow:
python build_forecast_dataset.py  # Process recent logs
python train_forecast.py          # Retrain models
# Application automatically reloads new models
```

### 3. Arduino Auto-Recovery
System automatically:
- Detects Arduino disconnection
- Clears invalid sensor values
- Attempts reconnection every 5 seconds
- Resumes monitoring when Arduino available

### 4. Prediction Confidence Scoring
- Probability output from RandomForest
- Stored confidence even if prediction changes
- Used to weight the majority voting
- Visible in dashboard as percentage

### 5. Time-Series Prediction
By incorporating time features, the model learns:
- Morning dew patterns
- Afternoon heating effects
- Weekly weather cycles
- Seasonal variations

---

## 🐛 Troubleshooting

### Issue: Arduino Not Detected
```
❌ Arduino not connected
```
**Solution**:
1. Check USB cable connection
2. Verify Arduino drivers installed (CH340/FTDI)
3. Check System Device Manager for COM port
4. Update port in configuration: `ARDUINO_PORT = "COM7"`
5. Restart Python application

### Issue: Model Files Not Found
```
❌ Error: Model files not found
```
**Solution**:
1. Run `python train_model.py` and `python train_forecast.py`
2. Verify .pkl files exist in project directory
3. Check file permissions
4. Ensure training data: `weather_classification_data.csv` exists

### Issue: Serial Port Already in Use
```
✗ Connection failed on COM7: [Errno 16] Device in use
```
**Solution**:
1. Close Arduino IDE serial monitor
2. Kill other Python processes using serial port
3. Try different COM port
4. Restart application

### Issue: Out of Range Sensor Values
```
⚠️  Warning: Temperature 120°C outside range (15-50°C)
```
**Solution**:
1. Check sensor hardware connections
2. Verify analog pin mapping in Arduino code
3. Calibrate sensor against known reference
4. Check for loose cables or poor solder joints

### Issue: Low Model Accuracy
```
Test Accuracy: 0.65
```
**Solution**:
1. Collect more diverse training data (1000+ samples)
2. Ensure at least 100+ samples per weather class
3. Verify sensor calibration
4. Review feature engineering (time features might help)
5. Try different RandomForest parameters:
   - Increase `n_estimators` (100 → 200)
   - Adjust `max_depth` (15 → 10-20)

### Issue: Dashboard Not Loading
```
ERR_CONNECTION_REFUSED
```
**Solution**:
1. Verify Flask app running: `python app.py`
2. Check firewall allows port 5000
3. Try: http://localhost:5000 instead of IP
4. Check console for error messages
5. Restart Flask with different port: `app.run(port=8080)`

### Issue: Data Not Logging
```
❌ CSV file not created
```
**Solution**:
1. Check write permissions in project directory
2. Verify monitoring session actually runs
3. Look for automatically created `weather_log_YYYY_MM.csv`
4. Manually create if missing: `touch weather_log_2026_03.csv`

### Issue: Predictions Constantly Changing
```
Different prediction every reading
```
**Solution**:
1. Reduce sensor noise with `SMOOTHING_WINDOW` increase
2. Increase voting window: `PREDICTION_VOTING_WINDOW = 5` (up from 3)
3. Check sensor calibration
4. Look for interference on sensor lines
5. Add shielding or ferrite filters

---

## 📚 Project Files Reference

| File | Purpose |
|------|---------|
| `app.py` | Main Flask application with Arduino integration |
| `train_model.py` | Current weather model trainer |
| `train_forecast.py` | 2-hour forecast model trainer |
| `build_forecast_dataset.py` | Dataset builder from logged data |
| `live_predict.py` | Standalone prediction script (no dashboard) |
| `predict_weather.py` | Deprecated (reference only) |
| `main.py` | WSGI entry point |
| `weather_classification_data.csv` | Training dataset (Kaggle) |
| `forecast_dataset.csv` | Generated forecast targets |
| `weather_log_YYYY_MM.csv` | Monthly sensor logs |
| `weather_model.pkl` | Current weather ML model |
| `forecast_model.pkl` | Forecast ML model |
| `templates/*.html` | Dashboard HTML pages |
| `static/css/*.css` | Dashboard styling |
| `pyproject.toml` | Project dependencies |
| `README.md` | This file |

---

## 🎓 Learning Resources

### Machine Learning Concepts
- **RandomForest**: https://scikit-learn.org/stable/modules/ensemble.html#random-forests
- **Feature Scaling**: https://scikit-learn.org/stable/modules/preprocessing.html
- **Time Series Features**: See `hour_of_day`, `day_of_week`, `month` in code

### Arduino Programming
- **Serial Communication**: https://www.arduino.cc/en/Serial/SerialBegin
- **Analog Reading**: https://www.arduino.cc/en/Reference/AnalogRead
- **Sensor Libraries**: Adafruit, SparkFun suites

### Weather Science
- **Atmospheric Pressure**: Indicator of weather systems
- **Humidity**: Combined with temp = "feels like" temperature
- **UV Index**: Solar radiation intensity (0-16+ scale)
- **Precipitation**: Rain/snow accumulation

---

## 📈 Future Enhancements

### Potential Improvements
1. **LSTM Networks** for sequential prediction
2. **GPU Acceleration** for faster inference
3. **Ensemble Methods** combining multiple models
4. **Cloud Integration** for remote logging
5. **Mobile App** for smartphone monitoring
6. **Weather API Integration** to supplement predictions
7. **Anomaly Detection** for sensor failures
8. **Multi-location Support** for distributed sensors
9. **Real-time Alerts** for severe weather
10. **Historical Prediction Accuracy** tracking

---

## 📄 License & Attribution

This project uses:
- Open-source Python libraries (Flask, Scikit-learn, Pandas)
- Kaggle weather dataset for training
- Arduino platform for hardware integration

---

## 💬 Support

For issues or questions:
1. Check [Troubleshooting](#troubleshooting) section
2. Review console output for error messages
3. Verify hardware connections and calibration
4. Check that all dependencies are installed correctly
5. Ensure Arduino code is properly uploaded

---

**Last Updated**: March 4, 2026
**Version**: 2.0 (ML-Enhanced with Pressure Feature)
**Status**: Production Ready
