import pandas as pd
import numpy as np
import os
from datetime import datetime, timedelta

def build_dataset(input_file="data/logs", output_file="data/datasets/forecast_dataset.csv"):
    try:
        print("="*70)
        print("BUILDING FORECAST DATASET")
        print("="*70)
        
        # If input_file is a directory, read all CSV logs inside
        if os.path.isdir(input_file):
            files = [os.path.join(input_file, f) for f in os.listdir(input_file) if f.endswith('.csv')]
            if not files:
                raise FileNotFoundError(f"No log CSVs found in {input_file}")
            frames = [pd.read_csv(f) for f in sorted(files)]
            df = pd.concat(frames, ignore_index=True)
            print(f"Loaded {len(files)} log files from {input_file}")
        else:
            if not os.path.exists(input_file):
                print(f"❌ ERROR: {input_file} not found!")
                print("   Please collect real weather data first by running the application")
                raise FileNotFoundError(f"Real data required: {input_file}")
            df = pd.read_csv(input_file)
        print(f"\n📊 Input Data:")
        print(f"   File: {input_file}")
        print(f"   Initial rows: {len(df)}")
        print(f"   Columns: {list(df.columns)}")
        
        # Validate required columns (match actual log column names)
        required_cols = ['temperature', 'humidity', 'precipitation', 
                        'uv_index', 'pressure', 'current_weather']
        missing = [col for col in required_cols if col not in df.columns]
        if missing:
            raise ValueError(f"Missing columns: {missing}")
        
        # Rename columns to standard format for training
        df = df.rename(columns={
            'temperature': 'Temperature',
            'humidity': 'Humidity',
            'precipitation': 'Precipitation (%)',
            'uv_index': 'UV Index',
            'pressure': 'Pressure',
            'current_weather': 'Condition'
        })
        
        # Parse timestamp if exists
        if 'timestamp' in df.columns:
            try:
                df['timestamp'] = pd.to_datetime(df['timestamp'], errors='coerce')
            except:
                print("   ⚠️  Could not parse timestamps, generating synthetic...")
                df['timestamp'] = pd.date_range(start='2026-01-01', periods=len(df), freq='5min')
        else:
            # Generate timestamps assuming 5-minute intervals
            df['timestamp'] = pd.date_range(start='2026-01-01', periods=len(df), freq='5min')
        
        # Remove duplicates and NaN values
        df = df.drop_duplicates().dropna(subset=['Temperature', 'Humidity', 'Precipitation (%)', 
                                                    'UV Index', 'Pressure', 'Condition'])
        print(f"   After cleaning: {len(df)} rows")
        
        # Sort by timestamp to ensure chronological order
        df = df.sort_values('timestamp').reset_index(drop=True)
        
        # Calculate 2-hour ahead targets (120 minutes / 5-minute intervals = 24 rows)
        df_forecast = df.copy()
        
        # Find the target condition approximately 2 hours ahead
        target_offset = 24  # 120 minutes / 5-minute interval
        
        # Create target by shifting by approximate 2 hours (based on row frequency)
        df_forecast['Target_Condition'] = df['Condition'].shift(-target_offset)
        
        # Remove rows where target is NaN
        df_forecast = df_forecast.dropna(subset=['Target_Condition'])
        print(f"   After creating 2-hour ahead targets: {len(df_forecast)} rows")
        
        # Extract time-based features from timestamp
        print(f"\n⏰ Extracting Time Features:")
        df_forecast['hour_of_day'] = df_forecast['timestamp'].dt.hour
        df_forecast['day_of_week'] = df_forecast['timestamp'].dt.dayofweek
        df_forecast['month'] = df_forecast['timestamp'].dt.month
        df_forecast['day_of_month'] = df_forecast['timestamp'].dt.day

        # Add lag features (previous reading)
        print("   ✅ Adding lag features: temp_t1, humidity_t1, pressure_t1")
        df_forecast['temp_t1'] = df_forecast['Temperature'].shift(1)
        df_forecast['humidity_t1'] = df_forecast['Humidity'].shift(1)
        df_forecast['pressure_t1'] = df_forecast['Pressure'].shift(1)

        # Add trend features (simple diffs)
        print("   ✅ Adding trend features: temp_change, pressure_change")
        df_forecast['temp_change'] = df_forecast['Temperature'].diff()
        df_forecast['pressure_change'] = df_forecast['Pressure'].diff()
        
        print(f"   ✅ hour_of_day")
        print(f"   ✅ day_of_week (0=Monday, 6=Sunday)")
        print(f"   ✅ month (1-12)")
        print(f"   ✅ day_of_month (1-31)")
        
        # Display feature statistics
        print(f"\n📈 Feature Statistics:")
        stats_cols = ['Temperature', 'Humidity', 'Precipitation (%)', 'UV Index', 'Pressure']
        for col in stats_cols:
            print(f"   {col}:")
            print(f"      Min: {df_forecast[col].min():.2f}, Max: {df_forecast[col].max():.2f}, Mean: {df_forecast[col].mean():.2f}")
        
        # Check time feature distribution
        print(f"\n⏰ Time Feature Distribution:")
        print(f"   Hours represented: {sorted(df_forecast['hour_of_day'].unique())}")
        print(f"   Days of week: {sorted(df_forecast['day_of_week'].unique())}")
        print(f"   Months: {sorted(df_forecast['month'].unique())}")
        
        # Check weather condition distribution
        print(f"\n🌤️  Weather Condition Distribution:")
        current_dist = df_forecast['Condition'].value_counts()
        target_dist = df_forecast['Target_Condition'].value_counts()
        print(f"   Current Conditions:")
        for condition, count in current_dist.items():
            pct = (count / len(df_forecast)) * 100
            print(f"      {condition}: {count} ({pct:.1f}%)")
        print(f"   Target Conditions (2h ahead):")
        for condition, count in target_dist.items():
            pct = (count / len(df_forecast)) * 100
            print(f"      {condition}: {count} ({pct:.1f}%)")
        
        # Save forecast dataset
        # Ensure output directory exists
        out_dir = os.path.dirname(output_file)
        if out_dir:
            os.makedirs(out_dir, exist_ok=True)

        # Drop rows with NaN in target or lag/trend features
        df_forecast = df_forecast.dropna(subset=['Target_Condition', 'temp_t1', 'humidity_t1', 'pressure_t1', 'temp_change', 'pressure_change'])

        df_forecast.to_csv(output_file, index=False)
        print(f"\n✅ Dataset saved: {output_file}")
        
        # Display sample
        print(f"\n📋 Sample Data (first 3 rows):")
        display_cols = ['timestamp', 'Temperature', 'Humidity', 'Condition', 
                       'Target_Condition', 'hour_of_day', 'day_of_week']
        print(df_forecast[display_cols].head(3).to_string())
        
        print("\n" + "="*70)
        
    except Exception as e:
        print(f"\n❌ Error building dataset: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    build_dataset()
